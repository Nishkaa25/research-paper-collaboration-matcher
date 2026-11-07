'use client';

import React, { useEffect, useState } from 'react';
import { 
  Sparkles, 
  Building2, 
  Send, 
  CheckCircle2, 
  BookOpen, 
  AlertCircle, 
  Search,
  Filter,
  User,
  ArrowRight
} from 'lucide-react';

export default function MatcherPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allResearchers, setAllResearchers] = useState<any[]>([]);
  const [selectedResearcherId, setSelectedResearcherId] = useState<number>(1);
  const [matches, setMatches] = useState<any[]>([]);
  const [targetResearcherInfo, setTargetResearcherInfo] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Send Request Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [requestTarget, setRequestTarget] = useState<any>(null);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestTopicId, setRequestTopicId] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (meRes.ok) {
          const meData = await meRes.json();
          setCurrentUser(meData.user);
          if (meData.user?.researcher_id) {
            setSelectedResearcherId(meData.user.researcher_id);
          }
        }

        const resList = await fetch('/api/researchers');
        if (resList.ok) {
          const data = await resList.json();
          setAllResearchers(data.researchers || []);
        }

        const topRes = await fetch('/api/topics');
        if (topRes.ok) {
          const data = await topRes.json();
          setTopics(data.topics || []);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, []);

  const fetchMatches = async (id: number) => {
    setLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/matches?researcher_id=${id}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        setMatches(data.matches || []);
        setTargetResearcherInfo(data.target_researcher);
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedResearcherId) {
      fetchMatches(selectedResearcherId);
    }
  }, [selectedResearcherId]);

  const handleOpenRequestModal = (target: any) => {
    setRequestTarget(target);
    setRequestTitle(`Collaboration on Research Initiatives`);
    setRequestMessage(`Hello ${target.full_name}, I reviewed your papers and research profile in RPCM. I believe our overlapping research interests present strong mutual collaboration opportunities.`);
    setRequestTopicId('');
    setModalOpen(true);
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestTarget) return;
    setSubmitting(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_id: requestTarget.researcher_id,
          proposed_topic_id: requestTopicId || null,
          title: requestTitle,
          message: requestMessage,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send collaboration request');
      }

      setActionMessage({ type: 'success', text: `Collaboration request sent to ${requestTarget.full_name} successfully!` });
      setModalOpen(false);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Could not send request' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Title & Controls Banner */}
      <section className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="badge badge-purple">
                <Sparkles size={14} /> pgvector Cosine Search
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Function: <code>find_similar_researchers()</code>
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '8px' }}>
              Semantic Collaborator Matcher
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Retrieves top semantic neighbours in 384-dimensional vector space, enriched with relational shared topics and co-authorship history.
            </p>
          </div>

          {/* Select Reference Researcher */}
          <div style={{ minWidth: '280px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Match Collaborators For:
            </label>
            <select
              value={selectedResearcherId}
              onChange={(e) => setSelectedResearcherId(parseInt(e.target.value, 10))}
              className="input-control"
              style={{ fontWeight: 600 }}
            >
              {allResearchers.map((r: any) => (
                <option key={r.researcher_id} value={r.researcher_id}>
                  {r.full_name} ({r.institution})
                </option>
              ))}
            </select>
          </div>
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

      {/* Results Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
          Top Potential Collaborators for <span style={{ color: 'var(--accent-blue)' }}>{targetResearcherInfo?.full_name}</span>
        </h2>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Ordered by cosine similarity <code>(1 - embedding &lt;=&gt; q)</code>
        </span>
      </div>

      {/* Matches Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          Computing pgvector similarity metrics...
        </div>
      ) : matches.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No vector recommendations found. Try selecting another researcher or triggering embedding rebuild in Admin.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
          {matches.map((m: any) => {
            const pct = Math.round(m.similarity * 100);
            return (
              <div
                key={m.researcher_id}
                className="glass-panel glass-panel-interactive"
                style={{
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  position: 'relative',
                }}
              >
                {/* Header: Name & Match Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                      {m.full_name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '2px' }}>
                      <Building2 size={14} /> {m.institution}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="badge badge-emerald" style={{ fontSize: '0.8rem', padding: '3px 8px' }}>
                      {pct}% Match
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Score: {m.similarity.toFixed(4)}
                    </div>
                  </div>
                </div>

                {/* Similarity Progress Bar */}
                <div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.max(10, Math.min(100, pct))}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 100%)',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>

                {/* Relational Indicators */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                  <span className="badge badge-blue">
                    {m.shared_topics} Shared Topic(s)
                  </span>
                  <span className="badge badge-purple">
                    <BookOpen size={12} /> {m.paper_count} Paper(s)
                  </span>
                  {m.already_coauthored ? (
                    <span className="badge badge-amber">Past Co-Author</span>
                  ) : (
                    <span className="badge badge-emerald">New Collaborator</span>
                  )}
                </div>

                {/* Expertise topics */}
                {m.topics && m.topics.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {m.topics.map((t: any, idx: number) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '0.72rem',
                          padding: '3px 8px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {t.name} (L{t.expertise_level})
                      </span>
                    ))}
                  </div>
                )}

                {/* Action button */}
                <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
                  <button
                    onClick={() => handleOpenRequestModal(m)}
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', padding: '10px' }}
                  >
                    <Send size={14} /> Send Collaboration Request
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Send Request Modal */}
      {modalOpen && (
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
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <div className="badge badge-blue" style={{ marginBottom: '8px' }}>
                Stored Procedure: <code>send_collaboration_request</code>
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                Request Collaboration with {requestTarget?.full_name}
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Institution: {requestTarget?.institution}
              </p>
            </div>

            <form onSubmit={handleSendRequest} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Proposed Topic (Optional)
                </label>
                <select
                  value={requestTopicId}
                  onChange={(e) => setRequestTopicId(e.target.value ? parseInt(e.target.value, 10) : '')}
                  className="input-control"
                >
                  <option value="">-- General / Multi-disciplinary --</option>
                  {topics.map((t: any) => (
                    <option key={t.topic_id} value={t.topic_id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Request Title
                </label>
                <input
                  type="text"
                  required
                  value={requestTitle}
                  onChange={(e) => setRequestTitle(e.target.value)}
                  placeholder="e.g. Joint study on Vector Similarity Indexing"
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Message to Collaborator
                </label>
                <textarea
                  rows={4}
                  required
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className="input-control"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
                  {submitting ? 'Executing Procedure...' : 'Submit Collaboration Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
