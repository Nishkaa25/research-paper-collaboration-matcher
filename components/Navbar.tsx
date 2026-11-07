'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Compass, 
  Search, 
  Users, 
  Send, 
  User, 
  ShieldCheck, 
  Terminal, 
  LogOut, 
  LogIn,
  Layers,
  Sparkles
} from 'lucide-react';

interface UserSession {
  researcher_id: number;
  full_name: string;
  email: string;
  role: 'researcher' | 'admin';
  institution?: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const quickLogin = async (email: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: email.includes('admin') ? 'Admin@123' : 'Welcome@123' }),
    });
    if (res.ok) {
      await fetchUser();
      router.refresh();
    }
  };

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: Compass },
    { href: '/matcher', label: 'Semantic Matcher', icon: Sparkles },
    { href: '/papers', label: 'Papers & Search', icon: Search },
    { href: '/requests', label: 'Requests', icon: Send },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/queries', label: 'SQL Showcase', icon: Terminal },
    ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin Portal', icon: ShieldCheck }] : []),
  ];

  return (
    <nav style={{
      background: 'rgba(11, 15, 25, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-color)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '0 20px',
    }}>
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '70px',
        gap: '20px',
      }}>
        {/* Brand Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--gradient-brand)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(59, 130, 246, 0.4)',
          }}>
            <Layers size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', color: '#fff' }}>
              RPCM <span style={{ color: 'var(--accent-blue)', fontWeight: 500, fontSize: '0.85rem' }}>pgvector</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Collaboration Matcher
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: active ? '#fff' : 'var(--text-secondary)',
                  background: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  border: active ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={16} color={active ? 'var(--accent-blue)' : 'currentColor'} />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* User Auth controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {loading ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Loading...</div>
          ) : user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>
                  {user.full_name}
                </span>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span className={`badge ${user.role === 'admin' ? 'badge-rose' : 'badge-blue'}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
                    {user.role}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {user.institution || 'PES Univ'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="btn btn-secondary btn-sm"
                title="Log Out"
                style={{ padding: '6px 10px' }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => quickLogin('ananya.rao@pes.example.edu')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                title="Login as Sample Researcher"
              >
                Researcher Demo
              </button>
              <button
                onClick={() => quickLogin('admin@pes.example.edu')}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '5px 10px' }}
                title="Login as Admin"
              >
                Admin Demo
              </button>
              <Link href="/login" className="btn btn-primary btn-sm">
                <LogIn size={14} />
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
