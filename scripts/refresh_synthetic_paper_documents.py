"""Refresh RPCM's synthetic full-text demo documents with topic-specific content.

This script updates only rows in paper_document where is_synthetic=TRUE.
It inserts missing synthetic documents, refreshes existing synthetic documents,
and preserves any author-supplied (is_synthetic=FALSE) documents unchanged.

All methodology and evaluation material is explicitly proposed/illustrative. The
script does not invent experimental results, datasets, DOI records, or citations.
Run after applying sql/10_create_synthetic_paper_documents.sql.
"""
from __future__ import annotations

import json
import os
import re
import sys
from typing import Any

import psycopg

MODEL_LABEL = "rpcm_contextual_synthetic_document_builder_v2"
NOTICE = (
    "SYNTHETIC DEMONSTRATION DOCUMENT. This fictional full-text sample was prepared "
    "from the title, abstract, author records, and topic tags in the RPCM demo database. "
    "It is not a real publication, has not been peer reviewed, and must not be cited as "
    "scholarly evidence. Methodology and evaluation sections describe a proposed study; "
    "they do not report experiments or measured results."
)


def clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def join_topics(topics: list[str]) -> str:
    topics = [clean(t) for t in topics if clean(t)]
    if not topics:
        return "the subject area described in the abstract"
    if len(topics) == 1:
        return topics[0]
    if len(topics) == 2:
        return f"{topics[0]} and {topics[1]}"
    return ", ".join(topics[:-1]) + f", and {topics[-1]}"


# Specific rules are intentionally ordered from narrow to broad. This prevents a
# word such as "privacy" in an edge-scheduling paper from incorrectly selecting
# a generic security template.
PROFILES: list[dict[str, Any]] = [
    {
        "key": "federated_edge_scheduling",
        "match": ("federated edge intelligence", "privacy-aware task scheduling", "edge devices"),
        "area": "privacy-aware scheduling for federated edge intelligence",
        "challenge": "assigning computational tasks across heterogeneous edge devices while balancing latency, energy use, resource availability, and the requirement to keep sensitive local data at its source",
        "method": (
            "A suitable study would model end devices, edge nodes, and any coordinating cloud service as distinct resource layers. "
            "Each device would retain its local data while participating in a federated model-update process. The scheduler could "
            "rank feasible execution nodes using observable signals such as available compute capacity, queue length, network delay, "
            "estimated energy cost, and task deadlines. Privacy constraints should be treated as explicit eligibility conditions, "
            "not merely as another performance score. The design should distinguish the scheduling policy from the federated "
            "aggregation procedure so their effects can be evaluated separately."
        ),
        "baselines": "static round-robin placement, a latency-only greedy scheduler, and a resource-aware scheduler without the federated privacy constraint",
        "metrics": "task-completion latency, deadline-miss rate, energy per completed task, edge-node utilisation, communication overhead, model-convergence behaviour, and the amount of sensitive data exposed outside each device",
        "discussion": "The central trade-off is between placing work close to data, which can reduce communication and exposure, and using a wider pool of resources, which may improve capacity. Federated updates can reduce raw-data movement but introduce communication cost and sensitivity to intermittent or non-identically distributed clients. A scheduler that optimises only latency may overload a small set of edge nodes or consume more energy. The design should therefore report how its decisions change under different device availability and network conditions.",
        "limitations": "A demonstration does not define a real edge topology, client population, workload trace, privacy threat model, or federated-learning protocol. A future study would need to specify attacker capabilities, data heterogeneity, client drop-out assumptions, and how energy and privacy are measured. No numerical outcomes are claimed here.",
    },
    {
        "key": "cloud_autoscaling_rl",
        "match": ("autoscaling", "reinforcement learning", "virtual machines"),
        "area": "reinforcement-learning-based cloud resource management",
        "challenge": "choosing how much virtualised capacity to provision as workload demand changes, while controlling service-level violations and infrastructure cost",
        "method": (
            "A proposed controller can represent the cloud service as a sequential decision process. Its state may include request rate, "
            "queue depth, CPU and memory utilisation, current instance count, and recent latency. Actions can represent scaling out, "
            "scaling in, or holding capacity. A reward design should make the trade-off between service-level objectives and resource "
            "cost explicit. Training and evaluation traces must be separated to avoid tuning the controller to the same workload periods "
            "used for reporting performance."
        ),
        "baselines": "a fixed-capacity configuration, a threshold-based reactive autoscaler, and a conventional predictive or rule-based policy",
        "metrics": "request latency percentiles, service-level objective violation rate, scaling delay, instance-hours, resource utilisation, and scaling oscillation frequency",
        "discussion": "A reinforcement-learning controller may adapt to workload patterns that are difficult to encode as fixed thresholds, but its behaviour depends on state design, reward weights, training coverage, and safe exploration. Rapid scale changes can themselves create instability. The evaluation should separate improvements in latency from increases in provisioned capacity and should test workload bursts that were not seen during training.",
        "limitations": "The sample record does not specify a cloud provider, workload trace, VM sizes, reward coefficients, or trained policy. Those choices would be required for a reproducible experiment. No measured SLA or cost improvement is asserted.",
    },
    {
        "key": "energy_aware_datacenter_scheduling",
        "match": ("energy-aware", "task scheduling", "data centre"),
        "area": "energy-aware scheduling in heterogeneous data centres",
        "challenge": "placing tasks across machines with different processing capacities and power profiles while meeting completion-time and workload constraints",
        "method": (
            "A proposed scheduler would represent each task by its resource demand and execution constraints and each machine by its "
            "capacity and power characteristics. The scheduling objective can combine makespan with energy use, while explicit feasibility "
            "checks prevent assignments that exceed machine capacity. A multi-objective heuristic could expose a tunable trade-off rather "
            "than collapsing all operational goals into an unexplained score."
        ),
        "baselines": "first-come-first-served scheduling, a performance-oriented load balancer, and an energy-unaware heterogeneous scheduler",
        "metrics": "makespan, total energy consumption, average and peak power, machine utilisation, task deadline satisfaction, and load imbalance",
        "discussion": "Aggressive consolidation may reduce the number of active machines but can increase queueing and thermal or capacity pressure on the remaining hosts. Spreading tasks can improve response time while consuming more energy. The usefulness of a multi-objective method therefore depends on the workload mix and the relative importance of energy and completion time.",
        "limitations": "A real evaluation would need measured or documented power models, task traces, hardware heterogeneity, and a stated objective-weight selection method. The synthetic document reports no measured energy savings.",
    },
    {
        "key": "edge_offloading",
        "match": ("task offloading", "edge computing", "latency"),
        "area": "latency-aware computation offloading in edge-cloud systems",
        "challenge": "deciding whether a task should execute on a device, a nearby edge node, or a remote cloud service under changing network and compute conditions",
        "method": (
            "A study could describe each task by input size, compute demand, deadline, and data-sensitivity constraints. Candidate execution "
            "locations would be evaluated using estimated communication delay, processing time, queueing, and resource availability. "
            "The offloading policy should distinguish the decision to offload from the subsequent resource allocation at the selected node."
        ),
        "baselines": "local-only execution, cloud-only execution, and a nearest-edge or latency-only offloading policy",
        "metrics": "end-to-end task latency, deadline misses, network traffic, device energy use, edge utilisation, and cloud-resource cost",
        "discussion": "Offloading is not always beneficial: a remote node may have more compute capacity but incur transmission and queueing delay. The preferred location can change with mobility, network congestion, task size, and data-locality requirements. Evaluation should include heterogeneous conditions rather than assuming a stable low-latency connection.",
        "limitations": "A real study would need a defined edge topology, mobility or network model, task workload, and device energy measurements. No deployment or measured latency result is represented by this sample.",
    },
    {
        "key": "container_placement",
        "match": ("container placement", "edge-cloud continuum"),
        "area": "container placement across edge and cloud infrastructure",
        "challenge": "placing containerised services across geographically and computationally heterogeneous sites while accounting for bandwidth, data locality, and resource constraints",
        "method": (
            "A proposed placement model would describe containers by CPU, memory, storage, and communication requirements, and sites by "
            "capacity, network connectivity, and proximity to data sources. The placement algorithm should enforce capacity constraints "
            "before optimising a stated objective such as communication cost or service latency. Reconfiguration overhead should be "
            "considered when workloads or site availability change."
        ),
        "baselines": "random feasible placement, resource-fit bin packing, and a latency-only placement policy",
        "metrics": "placement feasibility, service latency, inter-site traffic, resource utilisation, migration count, and scheduling time",
        "discussion": "A placement that minimises distance to one data source may increase traffic elsewhere or create hotspots. Data locality, available capacity, and network bandwidth can pull the placement decision in different directions. The evaluation should show how the policy behaves as sites become congested or unavailable.",
        "limitations": "A reproducible study would require a defined site topology, container workload, network-capacity model, and a clear migration-cost assumption. No specific deployment result is claimed.",
    },
    {
        "key": "stream_fault_tolerance",
        "match": ("fault tolerance", "stream processing", "checkpoint"),
        "area": "fault tolerance in distributed stream-processing systems",
        "challenge": "recovering stream-processing state after worker or node failures while limiting lost work, duplicate processing, and recovery delay",
        "method": (
            "A proposed design would identify operator state, processing partitions, checkpoint intervals, and the mechanism used to "
            "persist recovery information. Failure scenarios should distinguish worker crashes, network partitions, and storage delays. "
            "The checkpointing scheme should specify when state is captured, how it is replicated or persisted, and how processing resumes "
            "without violating the selected delivery semantics."
        ),
        "baselines": "periodic full checkpoints, a conventional incremental checkpointing strategy, and replay from the last durable offset",
        "metrics": "recovery time, amount of replayed data, checkpoint overhead, throughput during normal operation, state size, and duplicate or lost records",
        "discussion": "Frequent checkpoints can reduce recovery work but consume network, storage, and compute resources. Less frequent checkpoints reduce steady-state overhead but increase replay after failure. The best interval depends on state size, failure frequency, and the durability guarantees required by the application.",
        "limitations": "A real evaluation would need failure-injection procedures, stated delivery semantics, workload traces, and storage assumptions. The sample does not claim that a checkpointing implementation was built or measured.",
    },
    {
        "key": "geo_replicated_databases",
        "match": ("geo-replicated", "consistency", "replicated databases"),
        "area": "consistency and latency trade-offs in geo-replicated databases",
        "challenge": "maintaining a chosen consistency guarantee across geographically separated replicas despite network delay and partial failures",
        "method": (
            "A proposed analysis would define the replication topology, write and read paths, conflict-handling policy, and consistency "
            "model under study. Workloads should include read-heavy, write-heavy, and mixed access patterns. The design should distinguish "
            "client-observed consistency from internal replication progress and state how partitions or replica unavailability are handled."
        ),
        "baselines": "single-region execution, synchronous replication, and an asynchronous or eventual-consistency configuration",
        "metrics": "read and write latency, replication lag, conflict rate, availability during partitions, throughput, and consistency violations under the selected model",
        "discussion": "Stronger coordination can improve the predictability of reads but may increase latency when replicas are far apart. Relaxed consistency can improve availability and response time while requiring applications to tolerate stale reads or conflicts. Results need to be interpreted against the exact consistency contract rather than a single aggregate performance number.",
        "limitations": "A real study must name the consistency model, failure assumptions, geographic latency profile, and conflict workload. This sample contains no measured replication results.",
    },
    {
        "key": "learned_indexes",
        "match": ("learned index", "range quer", "b-tree"),
        "area": "learned index structures for database range queries",
        "challenge": "using learned models to predict record positions or key distributions while preserving efficient lookup and update behaviour",
        "method": (
            "A proposed implementation would train an index model over an explicitly defined key distribution and use its prediction "
            "to narrow the search interval. A correction procedure must preserve lookup correctness when the model prediction is imperfect. "
            "The design should specify how inserts, deletes, skew, and distribution shifts are handled, since a learned index is not useful "
            "if its maintenance cost outweighs its lookup benefit."
        ),
        "baselines": "a conventional B-tree, a sorted-array binary search, and a simple learned or interpolation-based index baseline",
        "metrics": "lookup latency, range-scan latency, model size, index memory, construction time, update cost, and worst-case correction steps",
        "discussion": "Learned indexes can exploit regularities in key distributions, but their performance is sensitive to data skew and changes over time. A fallback or correction mechanism is necessary to retain correctness. Evaluation should report both the fast path and the cost of prediction errors.",
        "limitations": "A reproducible comparison requires a specified key distribution, data size, update workload, hardware environment, and correctness tests. No lookup-speed improvement is claimed here.",
    },
    {
        "key": "gnn_query_optimization",
        "match": ("query optimisation", "graph neural network", "operator trees"),
        "area": "graph-neural-network-based database query optimisation",
        "challenge": "estimating query-plan costs from structured operator trees so that the optimiser can choose effective join orders and execution plans",
        "method": (
            "A proposed model would encode a query plan as a graph whose nodes represent relational operators and whose edges represent "
            "data flow. Node and edge features should capture relevant cardinality, predicate, and operator information where available. "
            "The learned cost estimate can then be compared with the database optimiser's estimates and used in a controlled plan-selection "
            "experiment. Training and test queries should be separated to assess generalisation to unseen query structures."
        ),
        "baselines": "the database system's native cost model, a feature-based regression model, and a graph model without selected structural features",
        "metrics": "cardinality or cost-estimation error, plan execution time, join-order quality, planning overhead, and generalisation to unseen query templates",
        "discussion": "A more accurate cost estimate does not automatically guarantee a faster plan if execution costs are affected by cache state, concurrency, or inaccurate cardinalities. The study should separate prediction quality from end-to-end query performance and measure the overhead of invoking the learned model.",
        "limitations": "A real evaluation needs a specified DBMS, query workload, plan representation, data statistics, and a protocol for preventing train-test leakage across related query templates. No benchmark result is asserted.",
    },
    {
        "key": "vector_index_databases",
        "match": ("vector similarity search", "hnsw", "ivf", "relational databases"),
        "area": "approximate nearest-neighbour search inside relational databases",
        "challenge": "supporting vector-similarity queries alongside relational operations while balancing retrieval quality, query latency, index size, and update cost",
        "method": (
            "A proposed benchmark would store fixed-dimensional vectors in a relational database and build the candidate approximate "
            "nearest-neighbour indexes under controlled configurations. Exact distance search should be retained as a ground-truth "
            "reference for recall calculation. Query parameters, vector dimension, dataset size, and insertion pattern should be varied "
            "independently so that index behaviour can be interpreted rather than attributed to one workload alone."
        ),
        "baselines": "exact flat search, HNSW with multiple search-depth settings, and IVF with multiple list/probe settings",
        "metrics": "recall@k, p50 and p95 query latency, index-build time, index size, memory use, and insertion or deletion overhead",
        "discussion": "HNSW and IVF expose different trade-offs between index construction, memory, and search effort. Higher recall may require more graph traversal or more lists to be probed, increasing latency. The benchmark should report the recall-latency frontier and include update behaviour, not only the best isolated query time.",
        "limitations": "A valid comparison needs the same vectors, distance metric, hardware, database configuration, and query set for each index. This synthetic document does not report measured recall or latency.",
    },
    {
        "key": "hybrid_scholarly_search",
        "match": ("hybrid", "bm25", "dense embeddings", "scholarly search"),
        "area": "hybrid keyword and semantic retrieval for scholarly search",
        "challenge": "combining exact lexical evidence with semantic similarity so that a search system can retrieve documents that use either matching terminology or related concepts",
        "method": (
            "A proposed retrieval pipeline would produce a lexical ranking, for example with BM25, and a dense-vector ranking from "
            "query and document embeddings. The rankings can be combined using a documented fusion method or a calibrated score. "
            "The system should retain separate component scores so that the effect of each retrieval channel can be analysed."
        ),
        "baselines": "BM25-only retrieval, dense-vector-only retrieval, and a hybrid rank-fusion configuration",
        "metrics": "recall@k, precision@k, mean reciprocal rank, nDCG@k, latency, and query coverage for exact-term and paraphrased queries",
        "discussion": "Lexical search is useful for names, identifiers, and uncommon terminology, while dense retrieval can bridge paraphrases and related concepts. Poor score calibration can let one channel dominate. A meaningful evaluation should separate queries that require exact matching from those that express concepts in different wording.",
        "limitations": "A real study requires a relevance-labelled scholarly query set, a documented tokenisation policy, and a held-out evaluation split. No retrieval effectiveness score is claimed for this sample.",
    },
    {
        "key": "scientific_summarization",
        "match": ("scientific text summarisation", "factual consistency", "human-written abstracts"),
        "area": "transformer-based scientific text summarisation",
        "challenge": "producing concise summaries of scholarly articles while retaining the original claims, methods, and limitations without introducing unsupported details",
        "method": (
            "A proposed study would define the input document scope, summary length, and target audience before selecting a transformer "
            "architecture and fine-tuning procedure. Article-level splits are needed so that sections from the same paper do not leak "
            "across training and evaluation. Human-written abstracts can provide a reference, but factual consistency should also be "
            "reviewed at the level of individual claims."
        ),
        "baselines": "extractive sentence selection, an unfine-tuned pretrained summariser, and a fine-tuned transformer model",
        "metrics": "summary coverage, factual consistency, redundancy, readability, human preference, and inference cost",
        "discussion": "A fluent summary can still omit a key limitation or state a relationship more strongly than the source. Automatic overlap metrics alone may not reveal these errors. Evaluation should combine quantitative text measures with expert review of whether each generated claim is supported by the article.",
        "limitations": "A real evaluation needs a legally usable article corpus, article-level splits, summary guidelines, and a defined factuality review protocol. No model accuracy or factuality result is invented here.",
    },
    {
        "key": "cross_lingual_embeddings",
        "match": ("cross-lingual", "low-resource indian languages", "multilingual sentence embeddings"),
        "area": "cross-lingual sentence representations for low-resource Indian languages",
        "challenge": "learning representations that place semantically equivalent sentences from different languages in comparable vector spaces despite limited labelled data",
        "method": (
            "A proposed evaluation would define the language pairs, script normalisation, sentence collection, and supervision available "
            "for each pair. A shared encoder or alignment objective can be assessed using parallel retrieval and downstream classification. "
            "Train, validation, and test partitions should prevent translated or near-duplicate sentences from appearing across splits."
        ),
        "baselines": "monolingual encoders, multilingual pretrained embeddings without task adaptation, and a simple bilingual alignment baseline",
        "metrics": "cross-lingual retrieval recall@k, classification F1, alignment quality, performance by language pair, and robustness to code-mixing or spelling variation",
        "discussion": "Performance can differ substantially across language pairs because training data, morphology, script resources, and domain coverage are uneven. Aggregate scores may hide weak support for a low-resource language. Reporting should therefore be broken down by language and data availability.",
        "limitations": "A reproducible study must document data licences, language varieties, transliteration choices, and human validation of parallel content. No language benchmark result is claimed.",
    },
    {
        "key": "citation_recommendation",
        "match": ("citation recommendation", "draft manuscript", "contextual embeddings"),
        "area": "context-aware citation recommendation for scholarly manuscripts",
        "challenge": "identifying prior work relevant to a manuscript passage while avoiding recommendations based only on broad topical overlap",
        "method": (
            "A proposed system would encode a citation context window and candidate paper passages or abstracts using contextual "
            "representations. Candidate retrieval can be followed by a reranking stage that considers the passage's technical terms, "
            "research claim, and citation intent. The evaluation must distinguish background citations, method citations, and comparison citations."
        ),
        "baselines": "keyword matching, BM25 over titles and abstracts, and dense similarity without context-aware reranking",
        "metrics": "precision@k, recall@k, nDCG, reciprocal rank, citation-intent accuracy, and expert assessment of recommendation appropriateness",
        "discussion": "A paper can be topically related without supporting the specific claim in a manuscript. Context-aware retrieval may improve specificity, but it can still surface work that is methodologically adjacent rather than evidentially appropriate. Recommendations should be presented as candidates for author verification, not automatic citations.",
        "limitations": "A real study requires a citation-context corpus with provenance, deduplication, and a careful policy for negative or retracted citations. No bibliographic references are fabricated in this sample.",
    },
    {
        "key": "misinformation_preprints",
        "match": ("misinformation", "academic preprints", "citation context"),
        "area": "claim-quality analysis in academic preprints",
        "challenge": "identifying potentially misleading statements while accounting for scientific uncertainty, citation context, and the difference between an unsupported claim and a false claim",
        "method": (
            "A proposed classifier would define the unit of analysis, such as a sentence-level claim or a paragraph with its cited context. "
            "Features could include linguistic signals, citation relationships, and evidence links. Human annotation guidelines must define "
            "what qualifies as misleading and provide an uncertainty option for claims that cannot be judged from the available text."
        ),
        "baselines": "lexical or rule-based indicators, a text-only classifier, and a classifier that also incorporates citation context",
        "metrics": "precision, recall, F1, calibration, false-positive rate, performance by claim type, and agreement with expert annotations",
        "discussion": "Scientific claims can be tentative, disputed, or later revised. A detector that labels every uncertain statement as misinformation risks suppressing legitimate discussion. The interface should expose evidence and uncertainty, and the model should assist human review rather than make an authoritative judgement.",
        "limitations": "A valid evaluation needs expert-reviewed labels, clear annotation definitions, temporal context for preprints, and safeguards against treating disagreement as misinformation. No claims about real papers are made here.",
    },
    {
        "key": "medical_image_ssl",
        "match": ("self-supervised", "medical images", "unlabeled medical scans"),
        "area": "self-supervised representation learning for medical images",
        "challenge": "learning useful visual representations from large collections of unlabelled scans when expert annotations are expensive or limited",
        "method": (
            "A proposed pipeline would pre-train an image encoder using a defined contrastive or other self-supervised objective, then "
            "transfer the representation to a downstream task with limited labelled examples. Patient-level data partitioning is essential "
            "to avoid slices or studies from the same patient appearing in different splits. The transfer procedure should specify which "
            "encoder layers are frozen or fine-tuned."
        ),
        "baselines": "training from scratch with labels, supervised pretraining where available, and a pretrained encoder without domain adaptation",
        "metrics": "task-appropriate sensitivity, specificity, AUROC, calibration, performance under reduced label budgets, and robustness across acquisition sites",
        "discussion": "Self-supervised pretraining may reduce dependence on labels, but representations can encode scanner, site, or population differences. Strong performance on one dataset does not establish clinical generalisation. External-site testing and careful patient-level splitting are central to the study design.",
        "limitations": "A real evaluation requires approved data access, de-identification, patient-level splits, clinically meaningful endpoints, and expert oversight. This synthetic document does not describe a clinical result.",
    },
    {
        "key": "edge_vision_inference",
        "match": ("vision transformers", "on-device inference", "quantise"),
        "area": "efficient vision-transformer inference on resource-constrained devices",
        "challenge": "reducing model memory, compute, and energy demands while maintaining useful visual-task performance on edge hardware",
        "method": (
            "A proposed implementation would apply structured pruning, quantisation, or both to a vision-transformer model and deploy "
            "the resulting model on a clearly specified edge device. The compression pipeline should record calibration data, bit width, "
            "pruning criteria, and any fine-tuning performed after compression. Accuracy and system measurements should be collected on the same device class."
        ),
        "baselines": "the uncompressed model, pruning-only, quantisation-only, and combined compression",
        "metrics": "task accuracy, model size, peak memory, inference latency, energy per inference, and throughput under the device's thermal limits",
        "discussion": "Compression methods can affect different layers and classes unevenly. A lower model size does not guarantee lower end-to-end latency if the hardware lacks efficient kernels for the chosen representation. Evaluation should therefore report the actual target device and runtime, not only theoretical FLOPs.",
        "limitations": "A reproducible study needs a specified vision task, dataset provenance, device model, inference runtime, and measurement procedure. No accuracy-retention figure is invented.",
    },
    {
        "key": "satellite_segmentation",
        "match": ("satellite image segmentation", "limited labels", "semi-supervised segmentation"),
        "area": "semi-supervised segmentation of satellite imagery",
        "challenge": "producing reliable pixel-level land or object labels when satellite imagery has limited annotated examples and may vary by geography or acquisition conditions",
        "method": (
            "A proposed approach would train a segmentation model using a small labelled subset and a larger unlabelled image collection. "
            "The semi-supervised objective should specify how pseudo-labels are generated, filtered, and updated. Geographic or temporal "
            "splits should be considered to test whether the model transfers beyond nearby tiles from the same scene."
        ),
        "baselines": "supervised training on the labelled subset, self-training with pseudo-labels, and a fully supervised upper-bound where labels are available for comparison only",
        "metrics": "mean intersection over union, class-wise F1, boundary accuracy, performance by region, and sensitivity to label-budget size",
        "discussion": "Pseudo-label errors can reinforce themselves, especially for rare classes or regions with different imaging conditions. Overall accuracy may conceal poor performance on small or uncommon objects. Evaluation should report class-wise and region-wise behaviour.",
        "limitations": "A valid study requires a documented sensor and acquisition period, spatially independent splits, annotation protocol, and a treatment of class imbalance. No segmentation scores are claimed.",
    },
    {
        "key": "protein_gnn",
        "match": ("protein function", "residue graphs", "molecular function"),
        "area": "graph-learning methods for protein function prediction",
        "challenge": "representing protein structure or sequence relationships as graphs and predicting functional labels while avoiding leakage between related proteins",
        "method": (
            "A proposed graph model would define what residues or structural units become nodes, which biochemical or spatial relationships "
            "become edges, and how node and graph features are constructed. The training protocol should group highly related proteins "
            "appropriately so that near-identical sequences do not make the test set artificially easy."
        ),
        "baselines": "sequence-based classifiers, conventional graph neural networks, and feature-based models using the same split protocol",
        "metrics": "per-function precision and recall, macro and micro F1, ranking metrics for multi-label prediction, and performance on held-out protein families",
        "discussion": "Graph representations can encode structural context but depend on the quality and availability of structural information. Function labels may be incomplete or imbalanced. Evaluation should distinguish interpolation among related proteins from generalisation to less related families.",
        "limitations": "A reproducible study requires a dated and licensed protein dataset, homology-aware splits, a defined ontology, and documented handling of missing labels. No biological discovery is claimed.",
    },
    {
        "key": "genomic_variant_ml",
        "match": ("genomic variant", "gradient boosting", "variant classification"),
        "area": "machine-learning classification of genomic variants",
        "challenge": "classifying variants from heterogeneous genomic annotations while managing class imbalance, correlated features, and the risk of data leakage across related samples",
        "method": (
            "A proposed pipeline would define the variant-level feature set, encode categorical annotations, handle missing values, and "
            "split data by an appropriate biological grouping rather than randomly splitting highly related records. Gradient-boosted "
            "models can be compared with simpler baselines, while feature-attribution methods should be interpreted as associations rather "
            "than causal explanations."
        ),
        "baselines": "majority-class and regularised linear baselines, random forests, and alternative gradient-boosting configurations",
        "metrics": "macro F1, per-class precision and recall, AUROC and AUPRC where appropriate, calibration, and performance across variant types",
        "discussion": "High overall accuracy can be misleading when pathogenic or rare classes are underrepresented. A model can also exploit dataset-specific annotations rather than biologically meaningful signals. External-cohort validation and calibrated uncertainty are important before any clinical interpretation.",
        "limitations": "A real study requires a curated variant source, phenotype context where appropriate, patient privacy safeguards, versioned annotations, and expert interpretation. No diagnostic or clinical claim is made.",
    },
    {
        "key": "drug_response",
        "match": ("drug response", "genomic and chemical data"),
        "area": "deep-learning approaches to drug-response prediction",
        "challenge": "integrating molecular and chemical features to estimate response while separating generalisation to unseen samples, compounds, or biological contexts",
        "method": (
            "A proposed survey or comparative study would first classify the input modalities, such as genomic profiles, molecular descriptors, "
            "and drug representations. It would compare model families and data-splitting strategies, paying special attention to whether "
            "the evaluation holds out cell lines, compounds, or cohorts. The review should distinguish prediction settings because each "
            "supports a different generalisation claim."
        ),
        "baselines": "regularised linear models, tree-based models, and neural models using single-modality versus combined features",
        "metrics": "appropriate regression error or ranking measures, correlation, calibration, and performance under held-out compounds or cohorts",
        "discussion": "Results from random splits can overstate performance if related samples or compounds appear in both training and testing. Multi-modal models may help when modalities provide complementary information, but missing data and batch effects complicate comparisons.",
        "limitations": "A rigorous survey should document search strategy, inclusion criteria, dataset versions, and comparability limits across studies. This sample does not claim a drug-response result or treatment recommendation.",
    },
    {
        "key": "federated_intrusion",
        "match": ("federated intrusion detection", "organisations", "traffic logs"),
        "area": "federated intrusion detection across organisations",
        "challenge": "collaboratively training detection models across organisations without centralising raw traffic logs, while accounting for non-identical network conditions and attack distributions",
        "method": (
            "A proposed design would define each organisation as a client with local traffic features and a shared model architecture. "
            "The federated protocol should specify client selection, update aggregation, communication frequency, and safeguards against "
            "poisoned or malformed updates. Data partitions should reflect realistic differences between organisations rather than assuming "
            "identically distributed traffic."
        ),
        "baselines": "local-only training, centralised training where permitted as a reference, and conventional federated averaging",
        "metrics": "per-class precision and recall, false-positive rate, detection delay, communication volume, convergence rounds, and cross-organisation generalisation",
        "discussion": "Federated training reduces raw-log centralisation but does not automatically guarantee privacy or robustness. Client heterogeneity can slow convergence, while malicious participants may manipulate updates. The evaluation should separate privacy architecture claims from empirical detection quality.",
        "limitations": "A real study needs a documented traffic dataset, organisation-level partitions, attack-label definitions, and a threat model for both clients and the aggregation service. No operational detection performance is claimed.",
    },
    {
        "key": "adversarial_intrusion",
        "match": ("adversarial attacks", "intrusion classifiers", "adversarial traffic"),
        "area": "adversarial robustness of network intrusion classifiers",
        "challenge": "understanding whether small or strategically chosen changes to network-traffic features can evade intrusion classifiers and how defensive training affects that vulnerability",
        "method": (
            "A proposed evaluation would establish a baseline intrusion classifier, define the attacker's knowledge and allowed feature "
            "changes, and generate constrained adversarial examples within the stated threat model. A robust-training defence could then "
            "be evaluated against both the original and held-out attack strategies. Data transformations must preserve the protocol or "
            "traffic constraints relevant to the intended setting."
        ),
        "baselines": "the unmodified classifier, conventional regularisation, and adversarial training under a documented attack budget",
        "metrics": "clean accuracy, attack success rate, robust precision and recall, false-positive rate, and inference overhead",
        "discussion": "A defence may improve robustness to the attack used during training but remain vulnerable to adaptive or unseen attacks. Stronger robustness can also reduce clean-data performance. The threat model and attack budget therefore need to be reported alongside every score.",
        "limitations": "A valid study requires safe, controlled data and attack procedures, a realistic threat model, and clear separation of training and evaluation attacks. No live-network attack is conducted or described here.",
    },
    {
        "key": "zero_trust_multicloud",
        "match": ("zero-trust", "multi-cloud", "access architecture"),
        "area": "identity-centred access control for multi-cloud workloads",
        "challenge": "enforcing consistent verification and least-privilege access when workloads, identities, and resources span multiple cloud providers",
        "method": (
            "A proposed architecture would identify human and service identities, resource boundaries, policy decision points, and policy "
            "enforcement points across the participating clouds. Access decisions should be based on explicit identity and context signals, "
            "with credential rotation, auditable policy changes, and a defined response to unavailable identity services. The design should "
            "state how provider-specific controls map to the common policy model."
        ),
        "baselines": "network-location-based trust, provider-native access policies configured independently, and a centralised policy approach without continuous context evaluation",
        "metrics": "unauthorised-access test outcomes, policy consistency, access-decision latency, policy propagation time, audit completeness, and operational overhead",
        "discussion": "Central policy coordination can improve consistency but may introduce availability and latency dependencies. Provider-specific identity and logging semantics can make policy portability difficult. A useful evaluation should include stale credentials, cross-cloud service calls, and identity-provider failure scenarios.",
        "limitations": "A real study requires named cloud environments, a threat model, a policy language, identity lifecycle assumptions, and controlled access tests. No deployed security guarantee is claimed.",
    },
    {
        "key": "encrypted_query_processing",
        "match": ("privacy-preserving query", "encrypted data", "encrypted columns"),
        "area": "query processing over encrypted database attributes",
        "challenge": "supporting useful relational operations over protected data while limiting information leakage and controlling computational overhead",
        "method": (
            "A proposed design would state the encryption or searchable-encryption primitive, the operations supported, and the information "
            "revealed by indexes, access patterns, or result sizes. Query plans should separate client-side cryptographic work from server-side "
            "processing. The supported query set must be explicit because encrypted selection and join operations have different feasibility "
            "and leakage properties."
        ),
        "baselines": "plaintext query execution, client-side decryption and filtering, and the selected encrypted-query baseline without the proposed optimisation",
        "metrics": "query latency, throughput, server and client CPU cost, storage overhead, communication volume, and the stated leakage profile",
        "discussion": "Reducing server-side computation may increase client work or communication. More expressive encrypted queries can expose additional structure or require more expensive primitives. Performance must be interpreted together with the security assumptions and leakage that the design accepts.",
        "limitations": "A rigorous study needs a formal threat model, cryptographic construction, leakage definition, key-management assumptions, and correctness tests. No security proof or measured overhead is supplied here.",
    },
    {
        "key": "rl_congestion_control",
        "match": ("congestion control", "reinforcement learning", "data-centre networks"),
        "area": "learning-based congestion control for data-centre networks",
        "challenge": "adjusting sending rates as network traffic and queue conditions change while avoiding persistent congestion, unfairness, and unstable oscillation",
        "method": (
            "A proposed controller would observe network signals such as queue occupancy, packet delay, loss, and available throughput, "
            "then select a rate adjustment. The reward should balance utilisation, delay, loss, and fairness. Evaluation should include "
            "multiple concurrent flows and cross-traffic, not only a single isolated sender."
        ),
        "baselines": "a conventional congestion-control algorithm, a fixed or rule-based rate controller, and an ablation without selected network-state features",
        "metrics": "throughput, queueing delay, packet loss, flow completion time, fairness, convergence time, and rate oscillation",
        "discussion": "A controller that aggressively fills available capacity can increase queueing delay for competing flows. Training on one traffic pattern may also produce brittle behaviour under different round-trip times or flow sizes. Stability and fairness should be treated as first-class outcomes alongside aggregate throughput.",
        "limitations": "A real study would require a stated network topology, transport protocol, traffic matrix, simulator or testbed, and safety constraints for online exploration. No congestion-control performance is claimed.",
    },
    {
        "key": "sdn_time_sensitive",
        "match": ("software-defined networking", "time-sensitive traffic", "bounded latency"),
        "area": "time-sensitive flow scheduling in software-defined networks",
        "challenge": "admitting and scheduling network flows so that latency or deadline bounds are respected despite shared link capacity and changing traffic demand",
        "method": (
            "A proposed controller would collect flow requirements and network-state information at the control plane, then compute routes "
            "or transmission schedules subject to link and timing constraints. The design should specify how often network state is refreshed, "
            "how conflicting flow requests are handled, and how reconfiguration overhead is bounded."
        ),
        "baselines": "shortest-path routing, priority scheduling, and a traffic-engineering baseline without explicit deadline constraints",
        "metrics": "deadline or latency-bound violations, flow completion time, link utilisation, admission rate, control-plane computation time, and reconfiguration overhead",
        "discussion": "Strict prioritisation can protect selected flows while starving lower-priority traffic. Frequent controller updates can react to changing demand but also increase control overhead. The evaluation should report both admitted-flow performance and the impact on rejected or lower-priority flows.",
        "limitations": "A real evaluation must define the traffic classes, topology, link capacities, timing guarantees, and controller failure assumptions. No bounded-latency guarantee is established by this sample.",
    },
    {
        "key": "rl_robotics",
        "match": ("robotic manipulation", "sample-efficient", "grasping policies"),
        "area": "sample-efficient reinforcement learning for robotic manipulation",
        "challenge": "learning manipulation policies when physical interactions are costly and exploration can damage objects or produce unsafe robot states",
        "method": (
            "A proposed approach would define the robot action space, observations, task-success condition, and safety constraints. "
            "A model-based component could predict short-horizon outcomes to reduce the number of real interactions, while uncertainty "
            "estimates guide when the policy should seek additional data. Simulation and physical evaluation should be reported separately, "
            "with the transfer procedure clearly described."
        ),
        "baselines": "model-free reinforcement learning, a conventional model-based policy, and a scripted or imitation-learning baseline",
        "metrics": "task success rate, interactions to reach a target success level, completion time, constraint violations, and sim-to-real performance gap",
        "discussion": "A method that is sample-efficient in simulation may depend on an inaccurate dynamics model when transferred to hardware. Exploration can also trade off learning speed against safety. Evaluation should consider task diversity and report failures rather than only successful trajectories.",
        "limitations": "A real study would need hardware details, task definitions, safety procedures, simulator assumptions, and repeated trials. No physical robot experiment is claimed.",
    },
    {
        "key": "safe_rl",
        "match": ("safe exploration", "reinforcement learning", "unsafe states"),
        "area": "safe exploration in reinforcement learning",
        "challenge": "learning a useful policy while constraining exploration so that actions do not enter states defined as unsafe by the application",
        "method": (
            "A proposed method would formalise the state, action, transition, and reward model together with an explicit safety constraint. "
            "The exploration policy should specify how unsafe actions are detected or prevented and what happens when the model is uncertain. "
            "The evaluation should distinguish constraint satisfaction during learning from final policy performance."
        ),
        "baselines": "unconstrained reinforcement learning, a penalty-based constrained objective, and a conservative safe-policy baseline",
        "metrics": "cumulative constraint violations, probability of entering unsafe states, reward or task performance, sample efficiency, and recovery behaviour",
        "discussion": "A strict safety filter may reduce exploration and slow learning, while a permissive filter may allow rare but severe failures. The balance depends on the reliability of the safety model and the cost of violations. Evaluation should state whether safety is guaranteed by design or only observed empirically.",
        "limitations": "A real study needs a formal definition of unsafe states, assumptions about model error, and a controlled benchmark. This document does not claim a formal guarantee or measured risk reduction.",
    },
    {
        "key": "multi_robot_gnn",
        "match": ("multi-robot", "path planning", "graph neural networks"),
        "area": "graph-based coordination for multi-robot path planning",
        "challenge": "planning collision-free paths for multiple robots operating in shared, cluttered environments while accounting for coordination and communication constraints",
        "method": (
            "A proposed representation would model robots, goals, and relevant environmental relationships as a graph. A graph neural "
            "network could produce local coordination signals or candidate path preferences, followed by a planner that checks collision "
            "and kinematic constraints. Evaluation should vary robot count, obstacle density, and communication availability."
        ),
        "baselines": "independent single-robot planning, prioritised planning, and a conventional multi-agent path-finding algorithm",
        "metrics": "success rate, path length, makespan, collision count, planning time, communication volume, and scalability with robot count",
        "discussion": "A learned coordination policy may capture interactions that are difficult to encode as local rules, but it must still respect hard collision constraints. Performance can degrade as the number of robots or environmental complexity grows. Generalisation to unseen layouts should be evaluated separately from performance on familiar maps.",
        "limitations": "A reproducible study needs a defined map suite, robot motion model, collision rules, communication assumptions, and repeated randomised scenarios. No robot deployment is reported.",
    },
    {
        "key": "explainable_recommender",
        "match": ("explainable recommendation", "researchers", "trust and adoption"),
        "area": "explanations for scholarly recommendation interfaces",
        "challenge": "helping researchers judge why a paper or collaborator was recommended without creating misleading confidence in an opaque ranking score",
        "method": (
            "A proposed interface study would compare explanation formats, such as shared topics, matched paper passages, and a concise "
            "description of the ranking signal. Participants should complete defined discovery tasks, and the study should separate perceived "
            "helpfulness from actual decision quality. Explanations must be traceable to the metadata or similarity evidence used by the system."
        ),
        "baselines": "recommendations with no explanation, recommendations with shared-topic explanations, and recommendations with richer evidence-linked explanations",
        "metrics": "task completion time, relevance judgement accuracy, explanation usefulness, trust calibration, user confidence, and adoption intent",
        "discussion": "More explanation is not necessarily better if it increases cognitive load or presents weak evidence as causal reasoning. A similarity score should not be framed as a probability of collaboration success. User studies should test whether explanations help people recognise both relevant and irrelevant recommendations.",
        "limitations": "A real study needs an approved participant protocol, task design, sampling plan, and a clear distinction between perceived trust and system correctness. No user-study outcomes are claimed.",
    },
    {
        "key": "citation_network_analytics",
        "match": ("citation networks", "visual analytics", "research communities"),
        "area": "visual analytics for scholarly citation networks",
        "challenge": "helping users explore relationships among publications and research communities without obscuring missing, delayed, or discipline-dependent citation data",
        "method": (
            "A proposed system would represent publications as nodes and citation relationships as directed edges. The interface could support "
            "filtering by year, venue, topic, and author, alongside graph layouts and summary measures. The visual design should expose the "
            "meaning of each metric and allow users to inspect the underlying records behind an aggregate pattern."
        ),
        "baselines": "table-based search, a conventional citation list, and a graph view without interactive filtering or linked metadata",
        "metrics": "task completion time, error rate, navigation depth, pattern-discovery accuracy, and qualitative usability feedback",
        "discussion": "Graph layouts can make communities visually salient but can also imply clusters that depend on layout parameters. Citation counts reflect time and field conventions as well as scholarly influence. Users should be able to inspect data coverage and avoid interpreting visual proximity as proof of intellectual agreement.",
        "limitations": "A real study needs a versioned citation corpus, documented coverage, task-based user evaluation, and accessibility checks. No citation impact claim is made here.",
    },
    {
        "key": "accessibility_portals",
        "match": ("accessibility evaluation", "scholarly web portals"),
        "area": "accessibility evaluation of scholarly web portals",
        "challenge": "identifying interface barriers that prevent people with different access needs from searching, reading, and navigating scholarly information",
        "method": (
            "A proposed audit would define the portal pages and user flows under review, then combine automated checks with manual "
            "keyboard, screen-reader, zoom, contrast, and form-interaction inspection. Each finding should be recorded with its location, "
            "reproduction steps, impact, and a reference to the applicable accessibility criterion."
        ),
        "baselines": "automated-only accessibility scanning, manual expert inspection, and a combined evaluation workflow",
        "metrics": "number and severity of violations, task completion success, keyboard accessibility, screen-reader operability, and remediation effort",
        "discussion": "Automated tools can identify some structural issues but cannot determine whether every interaction is understandable or usable. Manual evaluation is necessary for reading order, error recovery, and task context. Findings should distinguish conformance issues from broader usability observations.",
        "limitations": "A rigorous audit needs a defined standard and version, page sample, assistive-technology combinations, evaluator procedure, and a transparent severity rubric. No external portal audit is claimed by this synthetic document.",
    },
    {
        "key": "federated_health_edge",
        "match": ("federated learning", "edge", "health monitoring"),
        "area": "federated edge learning for wearable health monitoring",
        "challenge": "training health-monitoring models across wearable or mobile devices while limiting central collection of sensitive physiological measurements",
        "method": (
            "A proposed system would treat each device or institution as a client with local time-series data and a shared model architecture. "
            "The federated protocol should define local preprocessing, client participation, update aggregation, and handling of missing or "
            "intermittent devices. Evaluation must distinguish model utility from privacy claims and specify what information is communicated."
        ),
        "baselines": "local-only models, centralised training as a reference where permitted, and standard federated averaging",
        "metrics": "task-specific sensitivity and specificity, F1, calibration, communication cost, client participation rate, convergence, and performance across device groups",
        "discussion": "Federated learning can reduce raw-data transfer, but it does not by itself establish privacy protection or clinical reliability. Wearable data can vary by device, user, and context. A useful evaluation should report group-level performance and the effect of intermittent participation.",
        "limitations": "A real study requires ethics approval where relevant, secure handling of health data, a defined outcome, device diversity, and a privacy threat model. This sample does not make a medical claim.",
    },
    {
        "key": "knowledge_graph_completion",
        "match": ("knowledge graph completion", "missing links", "graph embeddings"),
        "area": "embedding-based knowledge graph completion",
        "challenge": "predicting missing entity-relation links while avoiding leakage from duplicated or inverse relations across training and test sets",
        "method": (
            "A proposed model would encode entities and relations into a shared vector space and score candidate triples. The data protocol "
            "should specify how entities and relations are partitioned and whether the task measures link prediction among known entities "
            "or generalisation to unseen entities. Negative sampling and inverse-relation handling must be documented."
        ),
        "baselines": "TransE-style translational embeddings, a bilinear scoring model, and a frequency-based relation baseline",
        "metrics": "mean reciprocal rank, Hits@k, filtered ranking metrics, performance by relation frequency, and inference cost",
        "discussion": "Embedding models can rank plausible links without proving that a relation is true. Frequent entities and relations can dominate aggregate metrics, so results should be broken down by degree and relation type. Data leakage through inverse edges can substantially inflate apparent performance.",
        "limitations": "A reproducible study needs a versioned knowledge graph, clear split construction, negative-sampling policy, and leakage checks. No new factual relationship is asserted by this demonstration.",
    },
    {
        "key": "llm_scholarly_bias",
        "match": ("bias", "large language models", "scholarly tasks"),
        "area": "bias evaluation of language models in scholarly tasks",
        "challenge": "measuring whether language-model outputs vary systematically with demographic, geographic, institutional, or linguistic cues in scholarly workflows",
        "method": (
            "A proposed audit would define the model version, task prompts, controlled input variations, and the outcome dimensions being "
            "measured. Paired prompts can help isolate the effect of selected attributes, but the audit should also examine interactions "
            "between attributes and task context. Human review is needed for outputs whose quality cannot be reduced to a simple score."
        ),
        "baselines": "the unmodified prompt, a prompt with controlled neutralisation, and comparisons across model versions or settings",
        "metrics": "disparity in task outcomes, consistency across paired prompts, error rates by group or language, calibration, and qualitative error categories",
        "discussion": "Observed differences may arise from prompt sensitivity, training-data representation, language proficiency, or task design. A single benchmark cannot establish that a model is unbiased. Results should report uncertainty and avoid generalising beyond the tested model, prompt set, and scholarly task.",
        "limitations": "A responsible study requires carefully designed test cases, a transparent annotation protocol, privacy safeguards, and documentation of model access conditions. No demographic conclusion is claimed here.",
    },
    {
        "key": "distributed_training",
        "match": ("distributed training", "commodity clusters", "communication overhead"),
        "area": "distributed training of deep neural networks on commodity clusters",
        "challenge": "coordinating gradient or parameter exchange across commodity nodes while managing communication overhead, stragglers, and variable network conditions",
        "method": (
            "A proposed implementation would define the parallelism strategy, batch partitioning, synchronisation schedule, and failure "
            "handling. Communication traces should be collected separately from computation time so that network and synchronisation "
            "bottlenecks can be distinguished. The study should compare scaling across node counts using a fixed model and workload."
        ),
        "baselines": "single-node training, synchronous data parallelism, and a selected communication-reduction technique",
        "metrics": "time to target quality, throughput, scaling efficiency, communication volume, network utilisation, straggler impact, and recovery overhead",
        "discussion": "Adding nodes does not guarantee faster training when communication or synchronisation dominates. Compression or asynchronous updates may reduce communication but can affect convergence or reproducibility. Evaluation should report both training speed and the quality reached at the stopping point.",
        "limitations": "A reproducible study needs model architecture, cluster hardware, network topology, software versions, batch sizes, and a fixed stopping criterion. No training-speed result is invented.",
    },
    {
        "key": "serverless_ml_inference",
        "match": ("serverless", "machine learning inference", "warm-start"),
        "area": "serverless deployment of machine-learning inference workloads",
        "challenge": "serving inference requests under variable demand while controlling cold-start delay, resource allocation, and tail latency",
        "method": (
            "A proposed evaluation would package a defined model and inference runtime into serverless functions, then vary arrival rate, "
            "concurrency, and warm-instance policy. The warm-start strategy should specify when an instance is retained, how idle cost is "
            "accounted for, and whether model initialisation or input loading dominates cold-start time."
        ),
        "baselines": "always-cold invocation, a conventional keep-alive policy, and a provisioned or container-based inference service",
        "metrics": "p50, p95, and p99 latency, cold-start frequency, throughput, idle resource cost, invocation cost, and model initialisation time",
        "discussion": "Keeping instances warm can lower tail latency but consumes resources during idle periods. The optimal policy depends on request predictability, model size, and provider behaviour. Evaluation should include bursty and sparse traffic, not just a steady request rate.",
        "limitations": "A real comparison requires the provider and region, runtime configuration, model size, billing assumptions, and repeated traffic traces. No cost or latency result is claimed.",
    },
    {
        "key": "cloud_telemetry_anomaly",
        "match": ("time-series anomaly", "cloud telemetry", "incidents"),
        "area": "anomaly detection in cloud infrastructure telemetry",
        "challenge": "identifying unusual operational behaviour in multivariate telemetry while controlling alert noise and accounting for changing workload patterns",
        "method": (
            "A proposed detector would define the telemetry signals, sampling frequency, missing-data policy, and anomaly labels or review "
            "procedure. Statistical and learned components can be compared using time-respecting data splits so that future observations "
            "do not leak into training. The alerting threshold should be calibrated against the operational cost of false alarms and missed incidents."
        ),
        "baselines": "seasonal statistical thresholds, a conventional anomaly detector, and a learned multivariate time-series model",
        "metrics": "precision, recall, false alarms per time window, detection delay, event-level F1, and robustness to workload drift",
        "discussion": "Anomaly detectors can mistake legitimate workload changes for failures or miss incidents that resemble historical behaviour. Point-wise metrics may not reflect whether an alert arrives early enough to be useful. Evaluation should report event-level outcomes and false-alarm burden.",
        "limitations": "A valid study needs incident labels or a transparent review protocol, timestamp-aware splits, data-retention rules, and an explicit definition of an anomaly. No operational detection performance is claimed.",
    },
    {
        "key": "knowledge_distillation",
        "match": ("knowledge distillation", "compact language models", "student"),
        "area": "knowledge distillation for compact language models",
        "challenge": "transferring useful behaviour from a larger teacher model to a smaller student model while reducing inference cost and preserving task-relevant quality",
        "method": (
            "A proposed study would define teacher and student architectures, tokenizer compatibility, training corpus, and distillation "
            "objective. It should distinguish logit-based, representation-based, and response-based supervision where applicable. The "
            "student should be evaluated on held-out tasks and prompts, with model size and inference configuration recorded."
        ),
        "baselines": "the teacher model, the student trained without distillation, and a smaller pretrained model under the same inference budget",
        "metrics": "task quality, calibration, model parameters, peak memory, tokens per second, latency, and energy or cost per request where measurable",
        "discussion": "A smaller student can reduce serving cost but may lose capabilities that are not represented in the distillation data. Average scores can hide failures on long-context or uncommon inputs. Evaluation should report both quality and resource use across task categories.",
        "limitations": "A reproducible study requires model versions, training-data rights, prompt and task suites, compute budget, and a fixed quality-cost comparison. No accuracy-retention figure is claimed.",
    },
    {
        "key": "reproducibility_survey",
        "match": ("reproducibility", "machine learning research", "checklist"),
        "area": "reproducibility practices in machine-learning research",
        "challenge": "understanding which reporting and artifact practices allow independent readers to inspect, repeat, and compare machine-learning experiments",
        "method": (
            "A proposed survey would define a search strategy, inclusion and exclusion criteria, publication window, and coding scheme "
            "for experimental reporting. Categories might include dataset provenance, preprocessing, model configuration, random seeds, "
            "software versions, compute resources, evaluation splits, and artifact availability. Screening and coding decisions should be "
            "recorded so that the review can be repeated."
        ),
        "baselines": "comparison across publication periods, research subfields, and reporting categories, using a consistent coding rubric",
        "metrics": "frequency of reported artifacts and configuration details, inter-rater agreement, completeness by category, and variation across subfields",
        "discussion": "Reproducibility is not a binary property: a paper may provide code while omitting data provenance or exact environment details. Artifact availability also does not guarantee that an experiment can be reproduced. The review should distinguish availability, executability, and independent replication.",
        "limitations": "A real survey needs a registered or documented search protocol, a representative publication sample, duplicate screening, and validated coding. This sample does not report a completed literature review.",
    },
]

DEFAULT_PROFILE = {
    "key": "general_applied_cs",
    "area": "the applied computer-science area described by the paper metadata",
    "challenge": "turning the problem described in the abstract into a well-defined computational task with explicit inputs, outputs, constraints, and evaluation criteria",
    "method": (
        "A proposed study should formalise the input data, target task, system boundary, and assumptions before selecting an implementation. "
        "It should compare the proposed approach with a transparent baseline, isolate the main design components, and document the "
        "preprocessing, configuration, and evaluation protocol."
    ),
    "baselines": "a simple rule-based or conventional baseline and a relevant established method selected for the stated task",
    "metrics": "task-specific effectiveness, error or quality measures, latency, resource use, and reproducibility under repeated evaluation",
    "discussion": "The central design choices should be assessed against the constraints stated in the abstract. A method can improve one objective while adding computational cost, operational complexity, or sensitivity to assumptions. Evaluation should make those trade-offs explicit rather than relying on a single aggregate score.",
    "limitations": "The available sample metadata does not define a verified dataset, completed protocol, or measured result. A real study would need to specify data provenance, implementation details, comparison baselines, and evaluation assumptions.",
}


def select_profile(title: str, abstract: str, topics: list[str]) -> dict[str, Any]:
    text = f"{title} {abstract} {' '.join(topics)}".lower()
    for profile in PROFILES:
        if all(term in text for term in profile["match"]):
            return profile
    return DEFAULT_PROFILE


def make_document(row: dict[str, Any]) -> dict[str, Any]:
    title = clean(row.get("title"))
    abstract = clean(row.get("abstract")) or "No abstract was supplied for this sample record."
    authors = clean(row.get("authors")) or "Demo author not specified"
    topics = [clean(t) for t in (row.get("topics") or []) if clean(t)]
    focus = join_topics(topics)
    profile = select_profile(title, abstract, topics)
    venue = clean(row.get("venue")) or "Demonstration venue not specified"

    intro = (
        f"This synthetic demonstration concerns {profile['area']}. The paper record, titled “{title}”, "
        f"is associated with {focus}. Its supplied abstract states: {abstract} The following sections expand "
        "that record into a structured reading example. They outline a plausible research question and a way "
        "to evaluate it; they do not claim that the listed authors conducted the proposed work."
    )
    problem = (
        f"The central problem is {profile['challenge']}. For a rigorous investigation, the system boundary, "
        "operating assumptions, inputs, outputs, constraints, and unit of analysis would need to be stated "
        "before implementation. In particular, the evaluation should make clear which conditions are held "
        "constant and which are varied, so that a change in an outcome can be interpreted in context."
    )
    method = (
        f"A topic-specific methodological outline is as follows. {profile['method']} "
        "The implementation record should include software versions, configuration parameters, data provenance, "
        "preprocessing, and any random seeds. If a learning-based component is used, the training, validation, "
        "and test partitions should be documented and separated at the appropriate entity or time level."
    )
    evaluation = (
        f"A future evaluation could compare the proposed approach with {profile['baselines']}. "
        f"Relevant outcomes include {profile['metrics']}. The protocol should include representative and "
        "stress conditions, report variation across runs where applicable, and separate primary outcomes from "
        "secondary diagnostics. No numerical results are supplied because this is a synthetic document and "
        "no experiment is represented as having been performed."
    )
    discussion = (
        f"The main considerations for interpreting this research direction are as follows. {profile['discussion']} "
        f"The topic tags ({focus}) indicate the intended subject coverage of the sample record, but they should "
        "not be treated as a substitute for a detailed literature review or evidence that the proposed method "
        "outperforms prior work."
    )
    limitations = (
        f"{profile['limitations']} The present full text was generated for the RPCM demonstration reader from "
        "the stored title, abstract, author list, venue, and topic tags. It is not peer reviewed, contains no "
        "verified experimental results, and does not establish that any described method was implemented. "
        "The author and venue metadata are fictional sample records unless independently replaced with verified data."
    )
    conclusion = (
        f"This synthetic document provides a structured example of how the paper record on {profile['area']} "
        "can be presented within RPCM. Its proposed problem framing, method outline, and evaluation criteria "
        "are intended to support the reading and collaboration-discovery demonstration. A genuine scholarly "
        "version would require author-verified methods, results, and traceable references."
    )

    return {
        "notice": NOTICE,
        "document_label": "Synthetic demonstration paper",
        "title": title,
        "abstract": abstract,
        "metadata": {
            "authors": authors,
            "publication_year": row.get("publication_year"),
            "venue": venue,
            "topics": topics,
            "research_area": profile["area"],
            "document_builder": MODEL_LABEL,
        },
        "sections": [
            {"heading": "I. INTRODUCTION", "paragraphs": [intro]},
            {"heading": "II. PROBLEM FORMULATION", "paragraphs": [problem]},
            {"heading": "III. PROPOSED METHODOLOGY", "paragraphs": [method]},
            {"heading": "IV. PROPOSED EVALUATION PLAN", "paragraphs": [evaluation]},
            {"heading": "V. DISCUSSION", "paragraphs": [discussion]},
            {"heading": "VI. LIMITATIONS AND REPRODUCIBILITY", "paragraphs": [limitations]},
            {"heading": "VII. CONCLUSION", "paragraphs": [conclusion]},
        ],
        "references_note": (
            "No external references are claimed for this synthetic demonstration document. "
            "Bibliographic entries must be added only after their publication details have been verified."
        ),
    }


def main() -> int:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL is not set in this PowerShell session.", file=sys.stderr)
        return 2

    inserted = updated = preserved = 0
    with psycopg.connect(database_url, connect_timeout=30) as conn:
        papers = conn.execute(
            """
            SELECT
                p.paper_id, p.title, p.abstract, p.publication_year,
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

        for values in papers:
            row = {
                "paper_id": values[0], "title": values[1], "abstract": values[2],
                "publication_year": values[3], "venue": values[4],
                "authors": values[5], "topics": values[6],
            }
            content = json.dumps(make_document(row), ensure_ascii=False)
            existing = conn.execute(
                "SELECT is_synthetic FROM paper_document WHERE paper_id = %s",
                (row["paper_id"],),
            ).fetchone()

            if existing is None:
                conn.execute(
                    """
                    INSERT INTO paper_document
                        (paper_id, document_content, document_kind, is_synthetic, generated_by)
                    VALUES (%s, %s::jsonb, 'synthetic_demo', TRUE, %s)
                    """,
                    (row["paper_id"], content, MODEL_LABEL),
                )
                inserted += 1
            elif existing[0] is True:
                conn.execute(
                    """
                    UPDATE paper_document
                    SET document_content = %s::jsonb,
                        document_kind = 'synthetic_demo',
                        generated_by = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE paper_id = %s AND is_synthetic = TRUE
                    """,
                    (content, MODEL_LABEL, row["paper_id"]),
                )
                updated += 1
            else:
                preserved += 1

        total = conn.execute("SELECT COUNT(*) FROM paper_document").fetchone()[0]
        synthetic_total = conn.execute(
            "SELECT COUNT(*) FROM paper_document WHERE is_synthetic = TRUE"
        ).fetchone()[0]

    print("Contextual synthetic paper document refresh completed.")
    print(f"Paper records scanned:                  {len(papers)}")
    print(f"New synthetic documents inserted:       {inserted}")
    print(f"Existing synthetic documents refreshed: {updated}")
    print(f"Author-supplied documents preserved:    {preserved}")
    print(f"Total documents in Neon:                {total}")
    print(f"Synthetic documents in Neon:            {synthetic_total}")
    print("Paper metadata, embeddings, authors, topics, and requests were not changed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
