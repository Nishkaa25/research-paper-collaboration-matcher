'use client';

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Filter, 
  PlusCircle, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  Cpu,
  Layers,
  Calendar,
  Building
} from 'lucide-react';

export default function PapersPage() {
  const [activeTab, setActiveTab] = useState<'search' | 'semantic'>('search');
  const [papers, setPapers] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Search Filters
  const [queryText, setQueryText] = useState('');
  const [searchMode, setSearchMode] = useState<'standard' | 'fts'>('fts');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Semantic Search State
  const [semanticQuery, setSemanticQuery] = useState('Graph Neural Networks for Database Query Optimisation');
  const [semanticResults, setSemanticResults] = useState<any[]>([]);
  const [semanticLoading, setSemanticLoading] = useState(false);

  // Add Paper Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [paperTitle, setPaperTitle] = useState('');
  const [paperAbstract, setPaperAbstract] = useState('');
  const [paperYear, setPaperYear] = useState(new Date().getFullYear());
  const [paperVenue, setPaperVenue] = useState('VLDB');
  const [paperDoi, setPaperDoi] = useState('');
  const [selectedTopicIds, setSelectedTopicIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function loadInitial() {
      try {
        const topRes = await fetch('/api/topics');
        if (topRes.ok) {
          const data = await topRes.json();
          setTopics(data.topics || []);
        }
      } catch (err) {
        console.error('Failed to load topics:', err);
      }
    }
    loadInitial();
    fetchPapers();
  }, []);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (queryText.trim()) params.append('q', queryText.trim());
      if (searchMode === 'fts') params.append('mode', 'fts');
      if (selectedTopic) params.append('topic', selectedTopic);
      if (selectedVenue) params.append('venue', selectedVenue);
      if (selectedYear) params.append('year', selectedYear);

      const res = await fetch(`/api/papers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPapers(data.papers || []);
      }
    } catch (err) {
      console.error('Error fetching papers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSemanticSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!semanticQuery.trim()) return;
    setSemanticLoading(true);

    try {
      const res = await fetch('/api/papers/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query_text: semanticQuery.trim(), limit: 8 }),
      });

      if (res.ok) {
        const data = await res.json();
        setSemanticResults(data.papers || []);
      }
    } catch (err) {
      console.error('Semantic search failed:', err);
    } finally {
      setSemanticLoading(false);
    }
  };

  const handlePublishPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: paperTitle,
          abstract: paperAbstract,
          publication_year: paperYear,
          venue_name: paperVenue,
          doi: paperDoi || null,
          topic_ids: selectedTopicIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to publish paper');
      }

      setActionMessage({ type: 'success', text: 'Paper published with author, topics, and a genuine MiniLM 384-dimensional embedding!' });
      setAddModalOpen(false);
      setPaperTitle('');
      setPaperAbstract('');
      setPaperDoi('');
      setSelectedTopicIds([]);
      fetchPapers();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Insert transaction failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Banner */}
      <section className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-blue">
                <Search size={14} /> Full-Text (GIN) & Vector (HNSW)
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Synthetic research corpus • full-text demo reader
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '8px' }}>
              Academic Literature Search & Retrieval
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Query the corpus using weighted PostgreSQL full-text search (tsvector) or explore high-dimensional semantic similarity.
            </p>
          </div>

          <button
            onClick={() => setAddModalOpen(true)}
            className="btn btn-primary"
            style={{ padding: '10px 18px' }}
          >
            <PlusCircle size={16} /> Add New Paper (INSERT DML)
          </button>
        </div>

        {actionMessage && (
          <div style={{
            marginTop: '20px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${actionMessage.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            color: actionMessage.type === 'success' ? '#34d399' : '#fb7185',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            {actionMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{actionMessage.text}</span>
          </div>
        )}
      </section>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('search')}
          className={`btn ${activeTab === 'search' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '0.9rem' }}
        >
          <Search size={16} /> Keyword & Full-Text Search
        </button>
        <button
          onClick={() => {
            setActiveTab('semantic');
            if (semanticResults.length === 0) handleSemanticSearch();
          }}
          className={`btn ${activeTab === 'semantic' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '0.9rem' }}
        >
          <Sparkles size={16} /> pgvector Semantic Similarity Search
        </button>
      </div>

      {/* TAB 1: KEYWORD & FULL TEXT SEARCH */}
      {activeTab === 'search' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Search Controls Card */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Search Query (Title & Abstract)
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="text"
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchPapers()}
                    placeholder="e.g. reinforcement learning, learned index, edge computing..."
                    className="input-control"
                  />
                  <button onClick={fetchPapers} className="btn btn-primary" style={{ padding: '0 20px' }}>
                    <Search size={16} /> Search
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Search Mode
                </label>
                <select
                  value={searchMode}
                  onChange={(e) => setSearchMode(e.target.value as any)}
                  className="input-control"
                >
                  <option value="fts">Full-Text (GIN tsvector + Rank)</option>
                  <option value="standard">Standard ILIKE Matching</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Topic Filter
                </label>
                <select
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                  className="input-control"
                >
                  <option value="">All Topics</option>
                  {topics.map((t: any) => (
                    <option key={t.topic_id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results List */}
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Executing PostgreSQL search query...
            </div>
          ) : papers.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No papers found matching the specified search criteria.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Showing {papers.length} publications ({searchMode === 'fts' ? 'ranked by ts_rank score' : 'ordered by year'})
              </div>
              {papers.map((p: any) => (
                <div
                  key={p.paper_id}
                  className="glass-panel"
                  style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                        {p.title}
                      </h3>
                      <div style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', marginTop: '2px' }}>
                        Authors: {p.authors || 'Unknown'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span className="badge badge-blue">{p.publication_year}</span>
                      {p.fts_rank && (
                        <span className="badge badge-purple" title="FTS Relevance Score">
                          Rank: {p.fts_rank}
                        </span>
                      )}
                    </div>
                  </div>

                  {p.snippet ? (
                    <div
                      style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}
                      dangerouslySetInnerHTML={{ __html: p.snippet }}
                    />
                  ) : (
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {p.abstract}
                    </p>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: '6px' }}>
                    {p.venue && <span>Venue: <strong>{p.venue}</strong> ({p.venue_type})</span>}
                    {p.doi && <span>DOI: <code>{p.doi}</code></span>}
                    {p.topics && <span style={{ color: 'var(--accent-purple)' }}>Topics: {p.topics}</span>}
                  </div>
                  {p.reader_path && (
                    <div>
                      <a href={p.reader_path} className="btn btn-secondary"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', textDecoration: 'none' }}>
                        <BookOpen size={14} /> Read Sample Paper
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SEMANTIC VECTOR SIMILARITY SEARCH */}
      {activeTab === 'semantic' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
            <form onSubmit={handleSemanticSearch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Research Concept or Hypothesis for Semantic Vector Matching
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={semanticQuery}
                  onChange={(e) => setSemanticQuery(e.target.value)}
                  placeholder="Enter abstract idea or keywords..."
                  className="input-control"
                />
                <button
                  type="submit"
                  disabled={semanticLoading}
                  className="btn btn-primary"
                  style={{ padding: '0 24px' }}
                >
                  <Sparkles size={16} />
                  {semanticLoading ? 'Embedding query with MiniLM...' : 'Semantic Match'}
                </button>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Your search text is embedded with <code>all-MiniLM-L6-v2</code>; pgvector ranks stored paper embeddings using cosine distance <code>(&lt;=&gt;)</code> and the HNSW index.
              </div>
            </form>
          </div>

          {/* Semantic Results */}
          {semanticLoading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Generating your 384-dimensional MiniLM query embedding and calculating cosine distances...
            </div>
          ) : semanticResults.length === 0 ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Submit a research concept query above to search papers semantically.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Retrieved {semanticResults.length} semantic matches ranked by cosine similarity
              </div>
              {semanticResults.map((p: any) => {
                const pct = Math.round((p.similarity_score || 0) * 100);
                return (
                  <div
                    key={p.paper_id}
                    className="glass-panel glass-panel-interactive"
                    style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                          {p.title}
                        </h3>
                        <div style={{ fontSize: '0.85rem', color: 'var(--accent-blue)', marginTop: '2px' }}>
                          {p.authors}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div className="badge badge-emerald" style={{ fontSize: '0.8rem' }}>
                          {pct}% Vector Match
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Score: {p.similarity_score}
                        </div>
                      </div>
                    </div>

                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {p.abstract}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {p.venue && <span>Venue: <strong>{p.venue}</strong></span>}
                      {p.publication_year && <span>Year: {p.publication_year}</span>}
                      {p.topics && <span style={{ color: 'var(--accent-purple)' }}>Topics: {p.topics}</span>}
                    </div>
                    {p.reader_path && (
                      <div>
                        <a href={p.reader_path} className="btn btn-secondary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', textDecoration: 'none' }}>
                          <BookOpen size={14} /> Read Sample Paper
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Paper Modal (Demonstrating Multi-Table Transaction INSERT DML) */}
      {addModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px',
        }}>
          <div className="glass-panel" style={{ maxWidth: '640px', width: '100%', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div>
              <div className="badge badge-purple" style={{ marginBottom: '8px' }}>
                Multi-Table ACID Transaction INSERT DML
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Publish New Research Paper</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Inserts into <code>paper</code>, <code>paper_author</code>, <code>paper_topic</code>, generates <code>paper_embedding</code>, and calls <code>refresh_researcher_embeddings()</code>.
              </p>
            </div>

            <form onSubmit={handlePublishPaper} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Paper Title *
                </label>
                <input
                  type="text"
                  required
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  placeholder="e.g. Distributed Consensus in Asynchronous Networks"
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Abstract *
                </label>
                <textarea
                  rows={4}
                  required
                  value={paperAbstract}
                  onChange={(e) => setPaperAbstract(e.target.value)}
                  placeholder="Summarize the core technical contribution, methodology, and empirical evaluation..."
                  className="input-control"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Venue / Conference Name
                  </label>
                  <input
                    type="text"
                    value={paperVenue}
                    onChange={(e) => setPaperVenue(e.target.value)}
                    placeholder="e.g. VLDB, NeurIPS, IEEE TCC"
                    className="input-control"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Publication Year
                  </label>
                  <input
                    type="number"
                    min={1900}
                    max={2100}
                    value={paperYear}
                    onChange={(e) => setPaperYear(parseInt(e.target.value, 10))}
                    className="input-control"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  DOI Identifier (Optional, validated by regex)
                </label>
                <input
                  type="text"
                  value={paperDoi}
                  onChange={(e) => setPaperDoi(e.target.value)}
                  placeholder="10.5555/rpcm.2025.042"
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Select Topics
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto', padding: '6px' }}>
                  {topics.map((t: any) => {
                    const selected = selectedTopicIds.includes(t.topic_id);
                    return (
                      <button
                        type="button"
                        key={t.topic_id}
                        onClick={() => {
                          if (selected) {
                            setSelectedTopicIds(selectedTopicIds.filter((id) => id !== t.topic_id));
                          } else {
                            setSelectedTopicIds([...selectedTopicIds, t.topic_id]);
                          }
                        }}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: selected ? 'var(--accent-blue)' : 'rgba(255, 255, 255, 0.05)',
                          color: selected ? '#fff' : 'var(--text-secondary)',
                          border: selected ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                        }}
                      >
                        {t.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting ? 'Executing Transaction...' : 'Commit Publication (INSERT)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
