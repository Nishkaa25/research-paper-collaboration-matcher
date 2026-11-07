"""Generate one normalized 384-dimensional embedding for a paper.

Reads {"title": ..., "abstract": ...} from stdin and writes one JSON object
on stdout. Progress/log messages are kept off stdout so the Node.js caller can
parse the output safely.
"""

import json
import sys

from sentence_transformers import SentenceTransformer

MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"


def main() -> None:
    payload = json.load(sys.stdin)
    title = str(payload.get("title", "")).strip()
    abstract = str(payload.get("abstract", "")).strip()

    if not title:
        raise ValueError("Paper title is required to generate an embedding.")

    text = f"{title}. {abstract}" if abstract else title
    model = SentenceTransformer(MODEL_ID)
    vector = model.encode(
        text,
        normalize_embeddings=True,
        convert_to_numpy=True,
        show_progress_bar=False,
    )

    result = {
        "model": MODEL_ID,
        "dimension": int(len(vector)),
        "embedding": [float(value) for value in vector],
    }
    if result["dimension"] != 384:
        raise RuntimeError(f"Expected 384 dimensions, received {result['dimension']}.")

    json.dump(result, sys.stdout, separators=(",", ":"))
    sys.stdout.write("\n")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"Embedding generation error: {exc}", file=sys.stderr)
        raise
