import './globals.css';
import type { Metadata } from 'next';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Research Paper Collaboration Matcher | PES University DBMS Level 3',
  description: 'PostgreSQL 15+ & pgvector powered collaboration matcher, semantic vector search, and hybrid academic retrieval system.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Navbar />
          <main style={{ flex: 1, padding: '24px 20px', maxWidth: '1360px', width: '100%', margin: '0 auto' }}>
            {children}
          </main>
          <footer style={{
            borderTop: '1px solid var(--border-color)',
            padding: '24px 20px',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            background: 'rgba(11, 15, 25, 0.8)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <strong>Research Paper Collaboration Matcher</strong> • PES University DBMS Experiential Learning (Level 3)
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <span>PostgreSQL 15+ with pgvector</span>
                <span>•</span>
                <span>HNSW Cosine Vector Index (384-d)</span>
                <span>•</span>
                <span>Next.js App Router</span>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
