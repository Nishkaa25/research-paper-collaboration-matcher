import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generatePaperEmbedding } from '@/lib/embeddings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const referencePaperId = body.reference_paper_id;
    const queryText = typeof body.query_text === 'string' ? body.query_text.trim() : '';
    const requestedLimit = Number(body.limit ?? 10);

    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 50) {
      return NextResponse.json(
        { error: 'Limit must be an integer between 1 and 50.' },
        { status: 400 }
      );
    }

    let rows: any[] = [];
    let strategy: string;
    let embeddingModel: string | undefined;

    if (referencePaperId !== undefined && referencePaperId !== null) {
      const referenceId = Number(referencePaperId);
      if (!Number.isInteger(referenceId) || referenceId < 1) {
        return NextResponse.json(
          { error: 'reference_paper_id must be a positive integer.' },
          { status: 400 }
        );
      }

      const reference = await query<{ paper_id: number }>(
        'SELECT paper_id FROM paper_embedding WHERE paper_id = $1',
        [referenceId]
      );
      if (reference.length === 0) {
        return NextResponse.json(
          { error: 'The selected reference paper does not have an embedding.' },
          { status: 404 }
        );
      }

      // Find papers nearest to an existing paper embedding.
      rows = await query(
        `SELECT p.paper_id, p.title, p.abstract, p.publication_year, p.doi,
                pd.reader_path,
                jc.name AS venue,
                ROUND((1 - (pe.embedding <=> ref.embedding))::numeric, 4) AS similarity_score,
                (SELECT string_agg(r.full_name, ', ' ORDER BY pa.author_position)
                 FROM paper_author pa JOIN researcher r ON r.researcher_id = pa.researcher_id
                 WHERE pa.paper_id = p.paper_id) AS authors,
                (SELECT string_agg(t.name, ', ' ORDER BY t.name)
                 FROM paper_topic pt JOIN topic t ON t.topic_id = pt.topic_id
                 WHERE pt.paper_id = p.paper_id) AS topics
         FROM paper_embedding pe
         JOIN paper p ON p.paper_id = pe.paper_id
         LEFT JOIN journal_conference jc ON jc.venue_id = p.venue_id
         LEFT JOIN paper_document pd ON pd.paper_id = p.paper_id
         CROSS JOIN (SELECT embedding FROM paper_embedding WHERE paper_id = $1) ref
         WHERE pe.paper_id <> $1
         ORDER BY pe.embedding <=> ref.embedding ASC
         LIMIT $2`,
        [referenceId, requestedLimit]
      );
      strategy = 'Reference-paper embedding + pgvector cosine distance (<=>)';
    } else if (queryText) {
      if (queryText.length > 2000) {
        return NextResponse.json(
          { error: 'Search query must be 2,000 characters or fewer.' },
          { status: 400 }
        );
      }

      // Embed the user's actual search text with the same MiniLM model used for papers.
      const queryEmbedding = await generatePaperEmbedding(queryText, '');
      const vectorLiteral = `[${queryEmbedding.join(',')}]`;

      // Compare the query vector directly with every stored paper vector.
      // The ORDER BY expression is compatible with the paper_embedding HNSW cosine index.
      rows = await query(
        `SELECT p.paper_id, p.title, p.abstract, p.publication_year, p.doi,
                pd.reader_path,
                jc.name AS venue,
                ROUND((1 - (pe.embedding <=> $1::vector))::numeric, 4) AS similarity_score,
                (SELECT string_agg(r.full_name, ', ' ORDER BY pa.author_position)
                 FROM paper_author pa JOIN researcher r ON r.researcher_id = pa.researcher_id
                 WHERE pa.paper_id = p.paper_id) AS authors,
                (SELECT string_agg(t.name, ', ' ORDER BY t.name)
                 FROM paper_topic pt JOIN topic t ON t.topic_id = pt.topic_id
                 WHERE pt.paper_id = p.paper_id) AS topics
         FROM paper_embedding pe
         JOIN paper p ON p.paper_id = pe.paper_id
         LEFT JOIN journal_conference jc ON jc.venue_id = p.venue_id
         LEFT JOIN paper_document pd ON pd.paper_id = p.paper_id
         ORDER BY pe.embedding <=> $1::vector ASC
         LIMIT $2`,
        [vectorLiteral, requestedLimit]
      );
      strategy = 'MiniLM query embedding + pgvector cosine distance (<=>)';
      embeddingModel = 'all-MiniLM-L6-v2';
    } else {
      return NextResponse.json(
        { error: 'Please provide either reference_paper_id or query_text.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      strategy,
      ...(embeddingModel ? { embedding_model: embeddingModel, query_embedding_dimensions: 384 } : {}),
      count: rows.length,
      papers: rows,
    });
  } catch (err: any) {
    console.error('Semantic search error:', err);
    return NextResponse.json(
      { error: err.message || 'Semantic search failed.' },
      { status: 500 }
    );
  }
}
