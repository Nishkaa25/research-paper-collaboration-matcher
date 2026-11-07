'use client';

import React, { useEffect, useState } from 'react';
import { 
  Send, 
  Inbox, 
  Check, 
  X, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function RequestsPage() {
  const [activeTab, setActiveTab] = useState<'inbox' | 'outbox'>('inbox');
  const [inboxRequests, setInboxRequests] = useState<any[]>([]);
  const [outboxRequests, setOutboxRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/requests');
      if (res.ok) {
        const data = await res.json();
        setInboxRequests(data.inbox || []);
        setOutboxRequests(data.outbox || []);
      }
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleRespond = async (requestId: number, decision: 'Accepted' | 'Rejected') => {
    setActionLoading(requestId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update request');
      }

      setActionMessage({
        type: 'success',
        text: `Request #${requestId} ${decision.toLowerCase()}! Procedure respond_to_request committed.`,
      });
      fetchRequests();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleWithdraw = async (requestId: number) => {
    setActionLoading(requestId);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to withdraw request');
      }

      setActionMessage({
        type: 'success',
        text: `Request #${requestId} withdrawn. Status updated via withdraw_request procedure.`,
      });
      fetchRequests();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Withdrawal failed' });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Accepted':
        return <span className="badge badge-emerald">Accepted</span>;
      case 'Rejected':
        return <span className="badge badge-rose">Rejected</span>;
      case 'Withdrawn':
        return <span className="badge badge-amber">Withdrawn</span>;
      default:
        return <span className="badge badge-blue">Pending</span>;
    }
  };

  const currentList = activeTab === 'inbox' ? inboxRequests : outboxRequests;
  const pendingInboxCount = inboxRequests.filter((r) => r.status === 'Pending').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Title Banner */}
      <section className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-purple">
                <Send size={14} /> Transactional Collaboration Pipeline
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                View: <code>v_collaboration_requests</code>
              </span>
            </div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '8px' }}>
              Collaboration Requests Management
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Manage requests backed by stored procedures (<code>respond_to_request</code>, <code>withdraw_request</code>) and trigger-enforced state immutability.
            </p>
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('inbox')}
          className={`btn ${activeTab === 'inbox' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '0.9rem' }}
        >
          <Inbox size={16} /> Incoming Inbox ({pendingInboxCount} pending)
        </button>
        <button
          onClick={() => setActiveTab('outbox')}
          className={`btn ${activeTab === 'outbox' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '8px 18px', fontSize: '0.9rem' }}
        >
          <Send size={16} /> Outgoing Outbox ({outboxRequests.length})
        </button>
      </div>

      {/* Requests List */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading requests from PostgreSQL view...
        </div>
      ) : currentList.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          {activeTab === 'inbox'
            ? 'No collaboration requests received yet. Other researchers can discover and request to collaborate with you.'
            : 'No collaboration requests sent yet. Explore the Semantic Matcher to find partners and send requests!'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {currentList.map((req: any) => (
            <div
              key={req.request_id}
              className="glass-panel"
              style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#fff' }}>
                      {req.title}
                    </h3>
                    {getStatusBadge(req.status)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {activeTab === 'inbox' ? (
                      <span>From: <strong>{req.sender_name}</strong> ({req.sender_institution})</span>
                    ) : (
                      <span>To: <strong>{req.receiver_name}</strong> ({req.receiver_institution})</span>
                    )}
                    {req.proposed_topic && (
                      <span style={{ marginLeft: '12px', color: 'var(--accent-blue)' }}>
                        Proposed Topic: <strong>{req.proposed_topic}</strong>
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Sent: {new Date(req.created_at).toLocaleDateString()}
                </div>
              </div>

              {req.message && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.9rem',
                  lineHeight: 1.5,
                  color: 'var(--text-primary)',
                }}>
                  {req.message}
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
                {activeTab === 'inbox' && req.status === 'Pending' && (
                  <>
                    <button
                      disabled={actionLoading === req.request_id}
                      onClick={() => handleRespond(req.request_id, 'Accepted')}
                      className="btn btn-success btn-sm"
                    >
                      <Check size={14} /> Accept Collaboration
                    </button>
                    <button
                      disabled={actionLoading === req.request_id}
                      onClick={() => handleRespond(req.request_id, 'Rejected')}
                      className="btn btn-danger btn-sm"
                    >
                      <X size={14} /> Decline
                    </button>
                  </>
                )}

                {activeTab === 'outbox' && req.status === 'Pending' && (
                  <button
                    disabled={actionLoading === req.request_id}
                    onClick={() => handleWithdraw(req.request_id)}
                    className="btn btn-secondary btn-sm"
                  >
                    <RotateCcw size={14} /> Withdraw Request
                  </button>
                )}

                {req.status !== 'Pending' && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Request lifecycle finalized (Trigger: <code>trg_cr_lifecycle</code> immutable)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
