'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent, customEmail?: string, customPassword?: string) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    const targetEmail = customEmail || email;
    const targetPassword = customPassword || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleLogin(undefined, demoEmail, demoPass);
  };

  return (
    <div style={{ maxWidth: '480px', margin: '40px auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>
          Sign In to RPCM
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          PostgreSQL authenticated using <code>authenticate_researcher()</code> & bcrypt
        </p>
      </div>

      {/* Main Login Card */}
      <div className="glass-panel" style={{ padding: '32px' }}>
        {error && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            background: 'rgba(244, 63, 94, 0.15)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: '#fb7185',
            fontSize: '0.85rem',
            marginBottom: '20px',
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={(e) => handleLogin(e)} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Institutional Email
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.example.edu"
                className="input-control"
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Lock size={16} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="input-control"
                style={{ paddingLeft: '38px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '6px', padding: '12px' }}
          >
            {loading ? 'Verifying with PostgreSQL...' : 'Sign In'}
            <ArrowRight size={16} />
          </button>
        </form>
      </div>

      {/* Quick Access Demo Credentials Card */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
          Pre-Configured Evaluation Accounts
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setDemoCredentials('ananya.rao@pes.example.edu', 'Welcome@123')}
            className="btn btn-secondary"
            style={{ justifyContent: 'space-between', padding: '10px 14px', width: '100%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
              <UserCheck size={18} color="var(--accent-blue)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Ananya Rao (Researcher)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cloud & ML • PES University</div>
              </div>
            </div>
            <span className="badge badge-blue">Role: Researcher</span>
          </button>

          <button
            type="button"
            onClick={() => setDemoCredentials('aisha.rahman@mpi.example.edu', 'Welcome@123')}
            className="btn btn-secondary"
            style={{ justifyContent: 'space-between', padding: '10px 14px', width: '100%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
              <UserCheck size={18} color="var(--accent-purple)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Aisha Rahman (Researcher)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Vector Search • Max Planck Institute</div>
              </div>
            </div>
            <span className="badge badge-purple">Role: Researcher</span>
          </button>

          <button
            type="button"
            onClick={() => setDemoCredentials('admin@pes.example.edu', 'Admin@123')}
            className="btn btn-secondary"
            style={{ justifyContent: 'space-between', padding: '10px 14px', width: '100%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
              <ShieldCheck size={18} color="var(--accent-rose)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>Portal Administrator (Admin)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Research Office • Full System Access</div>
              </div>
            </div>
            <span className="badge badge-rose">Role: Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
}
