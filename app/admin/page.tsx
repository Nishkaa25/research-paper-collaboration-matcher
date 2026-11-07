'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Users, 
  RefreshCw, 
  Sparkles, 
  Database, 
  Cpu, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  BookOpen,
  Building2
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<any>(null);
  const [researchers, setResearchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      if (meData.user?.role !== 'admin') {
        router.push('/dashboard');
        return;
      }

      const metRes = await fetch('/api/admin/metrics');
      if (metRes.ok) {
        const metData = await metRes.json();
        setMetrics(metData);
      }

      const resList = await fetch('/api/researchers');
      if (resList.ok) {
        const resData = await resList.json();
        setResearchers(resData.researchers || []);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [router]);

  const handleToggleActive = async (researcherId: number, currentStatus: boolean) => {
    setActionLoading(`toggle-${researcherId}`);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/researchers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ researcher_id: researcherId, is_active: !currentStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user status');
      }

      setMessage({ type: 'success', text: data.message });
      fetchAdminData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleTriggerAction = async (action: 'embeddings' | 'matches' | 'matview' | 'all') => {
    setActionLoading(action);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      setMessage({ type: 'success', text: data.message });
      fetchAdminData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Verifying administrative privileges...</div>;
  }

  const s = metrics?.summary;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Title Banner */}
      <section className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-rose">
                <ShieldCheck size={14} /> Administrator Control Center
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Role: <code>admin</code> (Protected API Endpoints)
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '8px' }}>
              Platform Administration & Maintenance
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Manage researcher accounts, monitor request status distribution, view materialized view aggregates, and execute vector index sync procedures.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              disabled={actionLoading !== null}
              onClick={() => handleTriggerAction('all')}
              className="btn btn-primary"
              style={{ padding: '10px 18px' }}
            >
              <RefreshCw size={16} className={actionLoading === 'all' ? 'animate-spin' : ''} />
              {actionLoading === 'all' ? 'Syncing...' : 'Sync Entire Database'}
            </button>
          </div>
        </div>

        {message && (
          <div style={{
            marginTop: '20px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`,
            color: message.type === 'success' ? '#34d399' : '#fb7185',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </div>
        )}
      </section>

      {/* KPI Stats Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESEARCHERS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px' }}>{s?.total_researchers || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{s?.active_researchers} active in system</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>PAPERS INDEXED</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px' }}>{s?.total_papers || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>With tsvector & 384-d vectors</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>MATCH PAIRS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px' }}>{s?.total_matches || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>In match_result table</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>COLLAB REQUESTS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px' }}>{s?.total_requests || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pending, Accepted, Rejected</div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>AFFILIATIONS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '6px' }}>{s?.total_institutions || 0}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Universities & labs</div>
        </div>
      </section>

      {/* Routine Stored Procedure Execution Panel */}
      <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Database Maintenance & Stored Functions</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Trigger backend maintenance procedures directly. Demonstrates stored functions, procedures, and materialized view refreshing.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Researcher Profile Embeddings</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Executes <code>refresh_researcher_embeddings()</code>: computes mean vector of authored papers for each researcher.
            </div>
            <button
              disabled={actionLoading !== null}
              onClick={() => handleTriggerAction('embeddings')}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 'auto' }}
            >
              Rebuild Profile Embeddings
            </button>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Semantic Match Generation</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Executes <code>generate_matches(5, 0.30)</code>: populates <code>match_result</code> with top-k non-coauthors using HNSW cosine distance.
            </div>
            <button
              disabled={actionLoading !== null}
              onClick={() => handleTriggerAction('matches')}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 'auto' }}
            >
              Regenerate Top Matches
            </button>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Topic Trends Materialized View</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Executes <code>REFRESH MATERIALIZED VIEW mv_topic_trends</code> to update pre-aggregated statistics.
            </div>
            <button
              disabled={actionLoading !== null}
              onClick={() => handleTriggerAction('matview')}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 'auto' }}
            >
              Refresh Materialized View
            </button>
          </div>
        </div>
      </section>

      {/* 2-Column Section: Request Breakdown & Materialized View Topic Trends */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Request Distribution (GROUP BY) */}
        <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Request Pipeline Distribution (GROUP BY)</h2>
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                  <th>Distribution</th>
                </tr>
              </thead>
              <tbody>
                {(metrics?.request_breakdown || []).map((rb: any) => {
                  const total = parseInt(s?.total_requests || '1', 10);
                  const pct = Math.round((parseInt(rb.count, 10) / total) * 100);
                  return (
                    <tr key={rb.status}>
                      <td>
                        <span className={`badge ${
                          rb.status === 'Accepted' ? 'badge-emerald' :
                          rb.status === 'Rejected' ? 'badge-rose' :
                          rb.status === 'Withdrawn' ? 'badge-amber' : 'badge-blue'
                        }`}>
                          {rb.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }}>{rb.count}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '80px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent-blue)', borderRadius: '3px' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Topic Trends from mv_topic_trends */}
        <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Materialized View: mv_topic_trends</h2>
            <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Pre-computed</span>
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Topic</th>
                  <th>Year</th>
                  <th>Papers</th>
                  <th>Researchers</th>
                </tr>
              </thead>
              <tbody>
                {(metrics?.topic_trends || []).slice(0, 7).map((tt: any, idx: number) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{tt.topic}</td>
                    <td>{tt.publication_year}</td>
                    <td style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{tt.papers}</td>
                    <td style={{ color: 'var(--accent-emerald)' }}>{tt.researchers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* User Management Table */}
      <section className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Researcher Account Management</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Deactivating a user tests trigger <code>trg_cr_active_sender</code> which prevents inactive researchers from dispatching new requests.
            </p>
          </div>
        </div>

        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name & Email</th>
                <th>Institution</th>
                <th>Papers</th>
                <th>Role</th>
                <th>Embedding</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {researchers.map((res: any) => (
                <tr key={res.researcher_id}>
                  <td style={{ color: 'var(--text-muted)' }}>#{res.researcher_id}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{res.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{res.email}</div>
                  </td>
                  <td>{res.institution}</td>
                  <td>{res.paper_count}</td>
                  <td>
                    <span className={`badge ${res.role === 'admin' ? 'badge-rose' : 'badge-blue'}`}>
                      {res.role}
                    </span>
                  </td>
                  <td>
                    {res.has_embedding ? (
                      <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>384-d Vector</span>
                    ) : (
                      <span className="badge badge-amber" style={{ fontSize: '0.65rem' }}>Missing</span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${res.is_active ? 'badge-emerald' : 'badge-rose'}`}>
                      {res.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td>
                    {res.role !== 'admin' && (
                      <button
                        disabled={actionLoading === `toggle-${res.researcher_id}`}
                        onClick={() => handleToggleActive(res.researcher_id, res.is_active)}
                        className={`btn ${res.is_active ? 'btn-danger' : 'btn-success'} btn-sm`}
                        style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                      >
                        {res.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
