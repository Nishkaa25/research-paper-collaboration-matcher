'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User, 
  BookOpen, 
  Sparkles, 
  Send, 
  Award, 
  Globe, 
  Building2, 
  ExternalLink,
  PlusCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [requestsSummary, setRequestsSummary] = useState({ inboxCount: 0, pendingCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const meRes = await fetch('/api/auth/me');
        if (!meRes.ok) {
          router.push('/login');
          return;
        }
        const meData = await meRes.json();
        setUser(meData.user);

        // Fetch detailed profile
        const profRes = await fetch(`/api/researchers/${meData.user.researcher_id}`);
        if (profRes.ok) {
          const profData = await profRes.json();
          setProfile(profData);
        }

        // Fetch collaborator recommendations
        const matchRes = await fetch(`/api/matches?researcher_id=${meData.user.researcher_id}&limit=4`);
        if (matchRes.ok) {
          const matchData = await matchRes.json();
          setMatches(matchData.matches || []);
        }

        // Fetch pending requests count
        const reqRes = await fetch('/api/requests?type=inbox');
        if (reqRes.ok) {
          const reqData = await reqRes.json();
          const pending = (reqData.requests || []).filter((r: any) => r.status === 'Pending').length;
          setRequestsSummary({
            inboxCount: (reqData.requests || []).length,
            pendingCount: pending,
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading researcher dashboard...
      </div>
    );
  }

  const researcher = profile?.researcher;
  const topics = profile?.topics || [];
  const papers = profile?.papers || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* Header Profile Banner */}
      <section className="glass-panel" style={{ padding: '32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute',
          right: '-40px',
          top: '-40px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '16px',
              background: 'var(--gradient-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.8rem',
              fontWeight: 800,
              boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)',
            }}>
              {researcher?.full_name?.charAt(0) || 'R'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{researcher?.full_name}</h1>
                <span className="badge badge-blue">{researcher?.role}</span>
                {researcher?.has_embedding && (
                  <span className="badge badge-purple" title="Profile vector embedding generated in PostgreSQL">
                    <Cpu size={12} /> 384-d Embedding Active
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Building2 size={14} /> {researcher?.institution} ({researcher?.department})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Globe size={14} /> {researcher?.city}, {researcher?.country}
                </span>
                {researcher?.orcid && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Award size={14} /> ORCID: {researcher.orcid}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Link href="/profile" className="btn btn-secondary btn-sm">
              <User size={14} /> Edit Profile
            </Link>
            <Link href="/papers" className="btn btn-primary btn-sm">
              <PlusCircle size={14} /> Publish Paper
            </Link>
          </div>
        </div>

        {researcher?.bio && (
          <p style={{ marginTop: '20px', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6, maxWidth: '900px' }}>
            {researcher.bio}
          </p>
        )}
      </section>

      {/* KPI Stats Bar */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>PUBLICATIONS</span>
            <BookOpen size={18} color="var(--accent-blue)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px' }}>
            {papers.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Authored & indexed papers
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>H-INDEX METRIC</span>
            <TrendingUp size={18} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px' }}>
            {researcher?.h_index !== null ? researcher?.h_index : 'N/A'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Validated by CHECK constraint &gt;= 0
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>COLLAB REQUESTS</span>
            <Send size={18} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px', color: requestsSummary.pendingCount > 0 ? '#34d399' : 'inherit' }}>
            {requestsSummary.pendingCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {requestsSummary.pendingCount} pending in inbox
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>RESEARCH TOPICS</span>
            <Sparkles size={18} color="var(--accent-amber)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '8px' }}>
            {topics.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Domain areas registered
          </div>
        </div>
      </section>

      {/* Topics & Recommended Matches 2-Column Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        {/* Research Topics */}
        <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Domain Expertise (researcher_topic)</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Level 1 to 5</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {topics.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No research topics registered yet.</div>
            ) : (
              topics.map((t: any) => (
                <div
                  key={t.topic_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{t.name}</span>
                  <span className="badge badge-amber" style={{ fontSize: '0.65rem', padding: '1px 5px' }}>
                    ★ Level {t.expertise_level}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Top Matches Preview */}
        <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Top Recommended Collaborators</h2>
            <Link href="/matcher" style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              View All <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {matches.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Run match generation in Admin or add papers to discover partners.
              </div>
            ) : (
              matches.slice(0, 3).map((m: any) => (
                <div
                  key={m.researcher_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.full_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {m.institution} • {m.shared_topics} shared topic(s)
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                      {(m.similarity * 100).toFixed(1)}% Match
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Authored Papers Section */}
      <section className="glass-panel" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>Published Works & Vector Status</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Relational papers authored by {researcher?.full_name} mapped to 384-d sentence embeddings
            </p>
          </div>
          <Link href="/papers" className="btn btn-secondary btn-sm">
            <PlusCircle size={14} /> Add Another Paper
          </Link>
        </div>

        {papers.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No publications found for this researcher profile yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {papers.map((p: any) => (
              <div
                key={p.paper_id}
                style={{
                  padding: '18px 20px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff' }}>{p.title}</h3>
                  <span className="badge badge-blue" style={{ fontSize: '0.75rem' }}>{p.publication_year}</span>
                </div>

                {p.abstract && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                    {p.abstract}
                  </p>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {p.venue && <span>Venue: <strong>{p.venue}</strong> ({p.venue_type})</span>}
                  {p.doi && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      DOI: <code>{p.doi}</code>
                    </span>
                  )}
                  {p.corresponding_author && (
                    <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Corresponding Author</span>
                  )}
                  {p.topics && (
                    <span style={{ color: 'var(--accent-blue)' }}>Topics: {p.topics}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
