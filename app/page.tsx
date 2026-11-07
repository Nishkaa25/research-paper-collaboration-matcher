import Link from 'next/link';
import { 
  Sparkles, 
  Search, 
  Send, 
  ShieldCheck, 
  Terminal, 
  Database, 
  GitBranch, 
  Zap, 
  ArrowRight,
  CheckCircle2,
  Cpu
} from 'lucide-react';

export default function HomePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', padding: '20px 0' }}>
      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: '60px 20px 40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        position: 'relative',
      }}>
        <div className="badge badge-blue animate-fade-in" style={{ padding: '6px 14px', fontSize: '0.8rem' }}>
          <Sparkles size={14} /> PES University • DBMS Experiential Learning Level 3
        </div>

        <h1 style={{
          fontSize: 'clamp(2.2rem, 5vw, 3.6rem)',
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: '-0.03em',
          maxWidth: '850px',
        }}>
          Research Paper <span style={{
            background: 'var(--gradient-brand)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>Collaboration Matcher</span>
        </h1>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: 'clamp(1rem, 2vw, 1.2rem)',
          maxWidth: '680px',
          lineHeight: 1.6,
        }}>
          An end-to-end academic recommendation engine powered by <strong>PostgreSQL 15+</strong> and <strong>pgvector</strong>.
          Discovers interdisciplinary research partners through high-dimensional semantic vector search and transactional workflow procedures.
        </p>

        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '10px' }}>
          <Link href="/matcher" className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
            <Sparkles size={18} />
            Explore Semantic Matcher
            <ArrowRight size={16} />
          </Link>
          <Link href="/papers" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
            <Search size={18} />
            Search Academic Papers
          </Link>
          <Link href="/queries" className="btn btn-secondary" style={{ padding: '12px 24px', fontSize: '1rem' }}>
            <Terminal size={18} />
            Inspect SQL Queries
          </Link>
        </div>
      </section>

      {/* Database Highlights Banner */}
      <section className="glass-panel" style={{ padding: '24px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px', color: 'var(--accent-blue)' }}>
              <Database size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>RELATIONAL CORE</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>12 Normalized Tables</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Foreign keys, CASCADE & RESTRICT</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.15)', borderRadius: '12px', color: 'var(--accent-purple)' }}>
              <Cpu size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>VECTOR ENGINE</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>pgvector 384-d HNSW</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Cosine distance operator (&lt;=&gt;)</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '12px', color: 'var(--accent-emerald)' }}>
              <Zap size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ADVANCED DBMS</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>Triggers & Procedures</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>5 triggers, 3 procedures, 5 views</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.15)', borderRadius: '12px', color: 'var(--accent-amber)' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>VERIFICATION</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>50/50 Tests Passed</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Domain, referential & transaction tests</div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Card 1: Semantic Matcher */}
        <div className="glass-panel glass-panel-interactive" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={22} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Semantic Collaborator Matching</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Computes mean profile embeddings across each researcher's published works and executes approximate nearest-neighbour search in PostgreSQL via HNSW cosine indexing.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <Link href="/matcher" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
              Launch Matcher <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 2: Paper Search & FTS */}
        <div className="glass-panel glass-panel-interactive" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.15)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Search size={22} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Hybrid Full-Text & Vector Search</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Search scholarly literature with weighted PostgreSQL <code>tsvector</code> and GIN indexing, or explore papers with vector similarity scores and keyword highlight snippets.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <Link href="/papers" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
              Browse Papers <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 3: Collaboration Lifecycle */}
        <div className="glass-panel glass-panel-interactive" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Send size={22} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Transactional Collaboration Workflow</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Send, accept, reject, or withdraw collaboration requests backed by stored procedures enforcing row locks, trigger validation, and atomic state transitions.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <Link href="/requests" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
              Manage Requests <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 4: Admin Portal */}
        <div className="glass-panel glass-panel-interactive" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(244, 63, 94, 0.15)', color: 'var(--accent-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Role-Based Admin Console</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Gated to administrators: toggle researcher active states, monitor materialized view trends, and execute maintenance procedures like profile vector recomputation.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <Link href="/admin" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
              Admin Console <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 5: SQL Demonstration */}
        <div className="glass-panel glass-panel-interactive" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Terminal size={22} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Live DBMS Query Showcase</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Run and inspect the 21 project benchmark SQL queries live: JOINs, window functions, CTEs, set operations, execution plans, and trigger demonstrations.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <Link href="/queries" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
              View Queries <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Card 6: Academic Demo Logins */}
        <div className="glass-panel glass-panel-interactive" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={22} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Evaluation Quick-Access</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Pre-seeded with 20 real academic researcher profiles, 40 research papers across 16 computer science topics, and 1 administrative portal account.
          </p>
          <div style={{ marginTop: 'auto', paddingTop: '12px' }}>
            <Link href="/login" className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
              Sign In Portal <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
