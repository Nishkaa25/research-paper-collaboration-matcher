import Link from 'next/link';
import styles from './page.module.css';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  LibraryBig,
  MapPin,
  ShieldAlert,
} from 'lucide-react';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface DocumentSection {
  heading: string;
  paragraphs: string[];
}

interface DocumentContent {
  notice?: string;
  document_label?: string;
  title?: string;
  abstract?: string;
  metadata?: {
    authors?: string;
    publication_year?: number | null;
    venue?: string;
    topics?: string[];
  };
  sections?: DocumentSection[];
  references_note?: string;
}

interface PaperDocumentRow {
  paper_id: number;
  title: string;
  abstract: string | null;
  publication_year: number | null;
  venue: string | null;
  authors: string | null;
  affiliations: string | null;
  topics: string[] | null;
  document_content: DocumentContent;
  is_synthetic: boolean;
}

type PageProps = {
  params: { id: string };
};

export default async function ReadPaperPage({ params }: PageProps) {
  const paperId = Number(params.id);
  if (!Number.isSafeInteger(paperId) || paperId < 1) notFound();

  const rows = await query<PaperDocumentRow>(
    `SELECT
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
         SELECT string_agg(DISTINCT af.name, ' · ' ORDER BY af.name)
         FROM paper_author pa
         JOIN researcher r ON r.researcher_id = pa.researcher_id
         LEFT JOIN affiliation af ON af.affiliation_id = r.affiliation_id
         WHERE pa.paper_id = p.paper_id AND af.name IS NOT NULL
       ), '') AS affiliations,
       COALESCE((
         SELECT array_agg(t.name ORDER BY t.name)
         FROM paper_topic pt
         JOIN topic t ON t.topic_id = pt.topic_id
         WHERE pt.paper_id = p.paper_id
       ), ARRAY[]::text[]) AS topics,
       pd.document_content,
       pd.is_synthetic
     FROM paper p
     JOIN paper_document pd ON pd.paper_id = p.paper_id
     LEFT JOIN journal_conference jc ON jc.venue_id = p.venue_id
     WHERE p.paper_id = $1
     LIMIT 1`,
    [paperId]
  );

  if (rows.length === 0) notFound();

  const paper = rows[0];
  const doc = paper.document_content || {};
  const sections = Array.isArray(doc.sections) ? doc.sections : [];
  const abstract = doc.abstract || paper.abstract || 'No abstract is available for this document.';
  const authors = paper.authors || doc.metadata?.authors || 'Demo author not specified';
  const topics = paper.topics?.length ? paper.topics : doc.metadata?.topics || [];
  const publicationYear = paper.publication_year || doc.metadata?.publication_year;
  const venue = paper.venue || doc.metadata?.venue || 'Demonstration venue';

  return (
    <main className={styles.reader_shell}>
      <div className={styles.reader_topbar}>
        <Link href="/papers" className={styles.back_link}>
          <ArrowLeft size={16} /> Back to Papers
        </Link>
        <div className={styles.reader_topbar_label}>
          <LibraryBig size={15} /> RPCM DIGITAL PAPER LIBRARY
        </div>
      </div>

      <article className={styles.paper_sheet}>
        <div className={styles.paper_running_head}>
          <span>RESEARCH PAPER FORMAT</span>
          <span>RPCM · PAPER {String(paper.paper_id).padStart(4, '0')}</span>
        </div>

        {paper.is_synthetic && (
          <div className={styles.synthetic_notice} role="note">
            <div className={styles.notice_icon}><ShieldAlert size={18} /></div>
            <div>
              <strong>Synthetic demonstration paper</strong>
              <p>
                {doc.notice ||
                  'This is fictional demonstration content created for the RPCM paper reader. It is not a real publication, has not been peer reviewed, and must not be cited as scholarly evidence.'}
              </p>
            </div>
          </div>
        )}

        <header className={styles.paper_header}>
          <div className={styles.paper_kicker}>{paper.is_synthetic ? 'SYNTHETIC RESEARCH DOCUMENT' : 'RESEARCH ARTICLE'}</div>
          <h1>{paper.title}</h1>
          <div className={styles.author_line}>{authors}</div>
          {paper.affiliations && (
            <div className={styles.affiliation_line}>
              <GraduationCap size={15} /> {paper.affiliations}
            </div>
          )}

          <div className={styles.paper_metadata}>
            <div className={styles.metadata_item}>
              <CalendarDays size={15} />
              <span>{publicationYear || 'Year not specified'}</span>
            </div>
            <div className={styles.metadata_item}>
              <BookOpen size={15} />
              <span>{paper.is_synthetic ? `Sample venue: ${venue}` : venue}</span>
            </div>
            <div className={styles.metadata_item}>
              <FileText size={15} />
              <span>Document ID: RPCM-{String(paper.paper_id).padStart(5, '0')}</span>
            </div>
          </div>
        </header>

        <section className={styles.abstract_block}>
          <h2>Abstract</h2>
          <p>{abstract}</p>
        </section>

        {topics.length > 0 && (
          <section className={styles.keyword_row} aria-label="Keywords">
            <strong>Index Terms—</strong>
            <span>{topics.join('; ')}</span>
          </section>
        )}

        <div className={styles.article_divider} />
        <div className={styles.article_body}>
          {sections.map((section, index) => (
            <section className={styles.paper_section} key={`${section.heading}-${index}`}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>{paragraph}</p>
              ))}
            </section>
          ))}
        </div>

        <section className={styles.references_block}>
          <h2>References</h2>
          <p>{doc.references_note || 'No external references are claimed for this document.'}</p>
          {paper.is_synthetic && (
            <p className={styles.reference_caveat}>
              No bibliographic references are fabricated for this sample. Replace this section with verified sources before treating any document as a scholarly publication.
            </p>
          )}
        </section>

        <footer className={styles.paper_footer}>
          <div>
            <strong>Research Paper Collaboration Matcher</strong>
            <span>Academic discovery and researcher collaboration platform</span>
          </div>
          <div className={styles.footer_right}>
            <MapPin size={13} />
            <span>{paper.is_synthetic ? 'Demonstration content · Not for citation' : 'Author-supplied document'}</span>
          </div>
        </footer>
      </article>

      <div className={styles.reader_bottom_note}>
        {paper.is_synthetic
          ? 'This document is provided only to demonstrate the RPCM reading experience. It does not represent a completed or peer-reviewed study.'
          : 'Full-text document provided by the author.'}
      </div>

    </main>
  );
}
