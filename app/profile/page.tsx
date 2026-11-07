'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Building2, 
  Globe, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Award,
  Sparkles,
  BookOpen
} from 'lucide-react';

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [bio, setBio] = useState('');
  const [department, setDepartment] = useState('');
  const [hIndex, setHIndex] = useState<number | ''>('');
  const [orcid, setOrcid] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        const profRes = await fetch(`/api/researchers/${meData.user.researcher_id}`);
        if (profRes.ok) {
          const data = await profRes.json();
          setProfile(data);
          setBio(data.researcher?.bio || '');
          setDepartment(data.researcher?.department || '');
          setHIndex(data.researcher?.h_index !== null ? data.researcher?.h_index : '');
          setOrcid(data.researcher?.orcid || '');
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.researcher?.researcher_id) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/researchers/${profile.researcher.researcher_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio,
          department,
          h_index: hIndex !== '' ? parseInt(String(hIndex), 10) : null,
          orcid: orcid.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      setMessage({
        type: 'success',
        text: 'Profile updated successfully! Database constraints (CHECK ck_researcher_hindex, ck_researcher_orcid) validated.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Profile update failed' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>Loading profile...</div>;
  }

  const r = profile?.researcher;

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <section className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-blue">
            <User size={14} /> Relational Profile
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            DML Operation: <code>UPDATE researcher</code>
          </span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '8px' }}>
          Researcher Profile & Affiliation
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Edit your profile metadata. Values are validated directly against PostgreSQL CHECK and UNIQUE constraints.
        </p>
      </section>

      {message && (
        <div style={{
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

      {/* Edit Form */}
      <form onSubmit={handleUpdate} className="glass-panel" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Full Name (Read-Only)
            </label>
            <input
              type="text"
              disabled
              value={r?.full_name || ''}
              className="input-control"
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Institutional Email
            </label>
            <input
              type="text"
              disabled
              value={r?.email || ''}
              className="input-control"
              style={{ opacity: 0.7, cursor: 'not-allowed' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Computer Science and Engineering"
              className="input-control"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              h-index (Validated by CHECK &gt;= 0)
            </label>
            <input
              type="number"
              min={0}
              value={hIndex}
              onChange={(e) => setHIndex(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              placeholder="e.g. 14"
              className="input-control"
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            ORCID Identifier (Regex CHECK validated)
          </label>
          <input
            type="text"
            value={orcid}
            onChange={(e) => setOrcid(e.target.value)}
            placeholder="0000-0002-1801-0001"
            className="input-control"
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Must match standard 16-digit format <code>0000-0000-0000-000X</code>
          </span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Biography & Research Interests
          </label>
          <textarea
            rows={4}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Describe your research domains, methodologies, and collaboration interests..."
            className="input-control"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '10px' }}>
          <button
            type="submit"
            disabled={saving}
            className="btn btn-primary"
            style={{ padding: '12px 24px' }}
          >
            <Save size={16} />
            {saving ? 'Executing UPDATE...' : 'Save Profile Changes (UPDATE DML)'}
          </button>
        </div>
      </form>
    </div>
  );
}
