"""Create clearly labelled synthetic full-text demo documents for RPCM papers.

The script reads existing paper metadata from Neon and inserts a structured
illustrative document into paper_document. It does not alter paper metadata,
authors, topics, embeddings, researcher profiles, matches, or requests.

Run only after applying sql/10_create_synthetic_paper_documents.sql.
"""

from __future__ import annotations

import json
import os
import re
import sys
from typing import Any

import psycopg

MODEL_LABEL = "rpcm_synthetic_document_builder_v1"
NOTICE = (
    "SYNTHETIC DEMONSTRATION DOCUMENT. This fictional full-text sample was generated "
    "for demonstrating the RPCM paper reader. It is not a real publication, has not "
    "been peer reviewed, and must not be cited as scholarly evidence. The evaluation "
    "section describes a proposed study only; it does not report measured results."
)


def clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def topic_phrase(topics: list[str]) -> str:
    if not topics:
        return "the associated research area"
    if len(topics) == 1:
        return topics[0]
    if len(topics) == 2:
        return f"{topics[0]} and {topics[1]}"
    return ", ".join(topics[:-1]) + f", and {topics[-1]}"


def domain_profile(title: str, abstract: str, topics: list[str]) -> dict[str, str]:
    text = f"{title} {abstract} {' '.join(topics)}".lower()

    if any(term in text for term in ("database", "query", "sql", "index", "relational", "transaction", "vector search", "hnsw", "ivf")):
        return {
            "area": "data management and database systems",
            "problem": "how a data-management system can improve query processing, indexing, retrieval, or transactional behaviour while preserving correctness",
            "method": "A suitable prototype would define representative query and update workloads, implement the proposed indexing or query-processing strategy, and compare it with a clearly specified baseline. The design should separate index construction, query execution, update handling, and result validation so that each source of overhead can be examined.",
            "metrics": "query latency, throughput, recall where approximate retrieval is involved, index-build time, update overhead, and memory use",
        }

    if any(term in text for term in ("privacy", "security", "zero-trust", "zero trust", "encrypted", "adversarial", "intrusion", "authentication")):
        return {
            "area": "security, privacy, and trustworthy computing",
            "problem": "how to protect data, identities, or computation while retaining the availability and performance required by the application",
            "method": "A suitable prototype would first define assets, actors, trust boundaries, and a threat model. It would then specify the proposed protection or policy mechanism, identify enforcement points, and evaluate both expected protections and the operational costs introduced by the design.",
            "metrics": "attack or policy-violation detection rate, false-positive rate, access-decision latency, resource overhead, and impact on legitimate workloads",
        }

    if any(term in text for term in ("cloud", "edge", "distributed", "serverless", "autoscaling", "scheduling", "data centre", "datacenter", "stream processing", "congestion", "network", "offloading", "container")):
        return {
            "area": "cloud, edge, networking, and distributed systems",
            "problem": "how distributed resources can be allocated or coordinated under changing workload, capacity, latency, energy, and reliability constraints",
            "method": "A suitable prototype would model the target infrastructure and workload, define the scheduling, placement, routing, or recovery decision being studied, and compare the proposed policy with a conventional baseline. Workload intensity and infrastructure conditions should be varied independently to reveal where the approach is effective and where it is sensitive to assumptions.",
            "metrics": "end-to-end latency, throughput, resource utilisation, energy consumption where relevant, availability, recovery time, and service-level objective violations",
        }

    if any(term in text for term in ("machine learning", "deep learning", "neural", "reinforcement learning", "federated", "classification", "prediction", "computer vision", "language model")):
        return {
            "area": "machine learning and intelligent systems",
            "problem": "how a learning-based method can improve prediction or decision-making while controlling generalisation, computational cost, and robustness",
            "method": "A suitable prototype would define the input representation and target task, establish a train-validation-test protocol, train the proposed model, and compare it with appropriate baselines. The study should include ablation tests for the main design choices and document how data leakage and class imbalance are handled.",
            "metrics": "task-appropriate precision, recall, F1 score, area under the ROC curve where relevant, inference latency, training cost, and robustness across evaluation splits",
        }

    return {
        "area": "applied computer science and information systems",
        "problem": "how the proposed system or method can address the practical constraints described in the abstract while remaining measurable and reproducible",
        "method": "A suitable prototype would formalise the use case, identify inputs and outputs, implement the principal method, and compare its behaviour with a transparent baseline. The implementation should isolate the major components so that their contributions can be studied independently.",
        "metrics": "task-specific effectiveness, latency, resource consumption, reliability, and reproducibility across repeated evaluation runs",
    }


def make_document(row: dict[str, Any]) -> dict[str, Any]:
    title = clean(row["title"])
    abstract = clean(row["abstract"]) or "No abstract was supplied for this sample record."
    authors = clean(row["authors"]) or "Demo author not specified"
    topics = row["topics"] or []
    topics = [clean(topic) for topic in topics if clean(topic)]
    year = row["publication_year"]
    venue = clean(row["venue"]) or "Demonstration venue not specified"
    focus = topic_phrase(topics)
    profile = domain_profile(title, abstract, topics)

    introduction = (
        f"This sample paper is situated in {profile['area']}, with particular emphasis on {focus}. "
        f"The record is titled “{title}”. The supplied abstract frames the central motivation as follows: {abstract} "
        "The purpose of this expanded document is to show how a paper can be represented and read inside "
        "the Research Paper Collaboration Matcher. It is illustrative content derived from the sample "
        "record, not a report of a completed scientific investigation."
    )

    problem = (
        f"The problem considered by this demonstration is {profile['problem']}. "
        f"For this paper, the scope is limited to the concepts named in its title, abstract, and topic tags: {focus}. "
        "A rigorous real study would state its assumptions, define the operating environment, identify the "
        "baseline against which the method is compared, and specify which outcomes count as success before "
        "running experiments. Those details are intentionally presented here as a study structure rather "
        "than as unverified facts."
    )

    method = (
        f"The following is a proposed methodological outline for the fictional study. {profile['method']} "
        "A reproducible implementation would record the software and hardware environment, configuration "
        "parameters, input data provenance, random seeds where applicable, and all preprocessing steps. "
        "Each experiment should be repeated sufficiently to distinguish stable behaviour from run-to-run variation."
    )

    evaluation = (
        f"A future empirical evaluation could report {profile['metrics']}. "
        "The evaluation should compare the proposed method with at least one simple baseline and one "
        "relevant established alternative. Results should be broken down by workload or data condition, "
        "not reported only as a single aggregate number. No numerical results are included in this sample "
        "because no experiment was conducted for this synthetic document."
    )

    discussion = (
        f"The abstract suggests that the central design trade-offs concern {focus}. "
        "The main question for a real evaluation would be whether improvements in the target objective "
        "remain consistent when system load, input characteristics, or environmental constraints change. "
        "A useful discussion would also identify conditions under which the proposed technique is not "
        "expected to help, since those boundary conditions are important when recommending collaborators "
        "whose research interests overlap only partially."
    )

    limitations = (
        "This document is synthetic demonstration content. It was assembled from the title, abstract, "
        "author names, venue label, and topic tags already stored in the RPCM sample database. It does "
        "not contain a verified dataset, a completed experimental protocol, measured results, or "
        "independently checked citations. Any methodology or evaluation described above is a proposed "
        "illustrative structure and must not be interpreted as work actually performed by the listed authors."
    )

    conclusion = (
        f"The sample record illustrates a research direction in {focus}. It provides a longer, readable "
        "demonstration document for the RPCM paper repository and can be used to test internal paper links, "
        "metadata display, and paper-based semantic discovery. A real publication would replace this "
        "illustrative text with author-supplied or verified full text and traceable references."
    )

    return {
        "notice": NOTICE,
        "document_label": "Synthetic demonstration paper",
        "title": title,
        "abstract": abstract,
        "metadata": {
            "authors": authors,
            "publication_year": year,
            "venue": venue,
            "topics": topics,
        },
        "sections": [
            {"heading": "1. Introduction", "paragraphs": [introduction]},
            {"heading": "2. Problem Setting and Scope", "paragraphs": [problem]},
            {"heading": "3. Proposed Methodology", "paragraphs": [method]},
            {"heading": "4. Proposed Evaluation Plan", "paragraphs": [evaluation]},
            {"heading": "5. Discussion", "paragraphs": [discussion]},
            {"heading": "6. Limitations and Reproducibility", "paragraphs": [limitations]},
            {"heading": "7. Conclusion", "paragraphs": [conclusion]},
        ],
        "references_note": "No external references are claimed for this synthetic demonstration document.",
    }


def main() -> int:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL is not set in this PowerShell session.", file=sys.stderr)
        return 2

    with psycopg.connect(database_url, connect_timeout=30) as conn:
        papers = conn.execute(
            """
            SELECT
                p.paper_id,
                p.title,
                p.abstract,
                p.publication_year,
                jc.name AS venue,
                COALESCE((
                    SELECT string_agg(r.full_name, ', ' ORDER BY pa.author_position)
                    FROM paper_author pa
                    JOIN researcher r ON r.researcher_id = pa.researcher_id
                    WHERE pa.paper_id = p.paper_id
                ), '') AS authors,
                COALESCE((
                    SELECT array_agg(t.name ORDER BY t.name)
                    FROM paper_topic pt
                    JOIN topic t ON t.topic_id = pt.topic_id
                    WHERE pt.paper_id = p.paper_id
                ), ARRAY[]::text[]) AS topics
            FROM paper p
            LEFT JOIN journal_conference jc ON jc.venue_id = p.venue_id
            ORDER BY p.paper_id
            """
        ).fetchall()

        if not papers:
            print("No papers found. Nothing was inserted.")
            return 0

        inserted = 0
        existing = 0
        for values in papers:
            row = {
                "paper_id": values[0],
                "title": values[1],
                "abstract": values[2],
                "publication_year": values[3],
                "venue": values[4],
                "authors": values[5],
                "topics": values[6],
            }
            content = make_document(row)
            result = conn.execute(
                """
                INSERT INTO paper_document
                    (paper_id, document_content, document_kind, is_synthetic, generated_by)
                VALUES (%s, %s::jsonb, 'synthetic_demo', TRUE, %s)
                ON CONFLICT (paper_id) DO NOTHING
                RETURNING paper_id
                """,
                (row["paper_id"], json.dumps(content, ensure_ascii=False), MODEL_LABEL),
            ).fetchone()
            if result:
                inserted += 1
            else:
                existing += 1

        total = conn.execute("SELECT COUNT(*) FROM paper_document").fetchone()[0]
        synthetic_total = conn.execute(
            "SELECT COUNT(*) FROM paper_document WHERE is_synthetic = TRUE"
        ).fetchone()[0]

    print("Synthetic full-text seeding completed.")
    print(f"Paper records scanned:             {len(papers)}")
    print(f"New synthetic documents inserted:  {inserted}")
    print(f"Existing documents preserved:     {existing}")
    print(f"Total documents now in Neon:      {total}")
    print(f"Synthetic documents in Neon:      {synthetic_total}")
    print("No paper metadata, embeddings, authors, topics, or collaboration requests were changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
