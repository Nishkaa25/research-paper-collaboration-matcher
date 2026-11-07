'use client';

import React, { useEffect, useState } from 'react';
import { 
  Terminal, 
  Play, 
  Clock, 
  Layers, 
  Database, 
  Code2, 
  CheckCircle2, 
  Table as TableIcon
} from 'lucide-react';

export default function QueriesPage() {
  const [queriesList, setQueriesList] = useState<any[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>('Q1');
  const [activeQueryData, setActiveQueryData] = useState<any>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/analytics/queries');
        if (res.ok) {
          const data = await res.json();
          setQueriesList(data.queries || []);
        }
      } catch (err) {
        console.error('Failed to load query catalog:', err);
      }
    }
    loadCatalog();
  }, []);

  const runQuery = async (key: string) => {
    setSelectedKey(key);
    setRunning(true);
    try {
      const res = await fetch(`/api/analytics/queries?key=${key}`);
      if (res.ok) {
        const data = await res.json();
        setActiveQueryData(data);
      }
    } catch (err) {
      console.error('Failed to run query:', err);
    } finally {
      setRunning(false);
    }
  };

  useEffect(() => {
    if (selectedKey) {
      runQuery(selectedKey);
    }
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Title Banner */}
      <section className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-amber">
            <Terminal size={14} /> Interactive SQL Showcase
          </span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            File: <code>sql/06_queries.sql</code>
          </span>
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '8px' }}>
          DBMS Benchmark Queries & Execution Plans
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
          Live demonstration of relational JOINs, GROUP BY, HAVING, subqueries, window functions, full-text search, and pgvector operations.
        </p>
      </section>

      {/* Main 2-Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '24px' }}>
        {/* Left Sidebar: Query Selector */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', height: 'fit-content' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Select DBMS Query ({queriesList.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {queriesList.map((q: any) => {
              const active = selectedKey === q.key;
              return (
                <button
                  key={q.key}
                  onClick={() => runQuery(q.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: active ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    border: active ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                    color: active ? '#fff' : 'var(--text-primary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--accent-blue)', marginRight: '6px' }}>{q.key}</span>
                      {q.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {q.category}
                    </div>
                  </div>
                  <Play size={14} color={active ? 'var(--accent-blue)' : 'var(--text-muted)'} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Section: SQL Code & Live Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Query Details & SQL Box */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="badge badge-blue">{activeQueryData?.key}</span>
                  <span className="badge badge-purple">{activeQueryData?.category}</span>
                </div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: '8px' }}>
                  {activeQueryData?.title}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>
                  {activeQueryData?.description}
                </p>
              </div>

              {activeQueryData?.executionTimeMs !== undefined && (
                <div className="badge badge-emerald" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                  <Clock size={12} /> Executed in {activeQueryData.executionTimeMs}ms
                </div>
              )}
            </div>

            {/* SQL Box */}
            <div style={{ position: 'relative' }}>
              <pre className="code-box">
                <code>{activeQueryData?.sql}</code>
              </pre>
            </div>
          </div>

          {/* Results Table Card */}
          <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TableIcon size={18} color="var(--accent-blue)" />
                Live Result Rows ({activeQueryData?.count || 0})
              </h3>
              <button
                onClick={() => runQuery(selectedKey)}
                disabled={running}
                className="btn btn-secondary btn-sm"
              >
                <Play size={12} /> Re-run Query
              </button>
            </div>

            {running ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                Executing query on PostgreSQL database...
              </div>
            ) : !activeQueryData?.results || activeQueryData.results.length === 0 ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                No rows returned by this query.
              </div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      {Object.keys(activeQueryData.results[0]).map((col) => (
                        <th key={col}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeQueryData.results.map((row: any, rIdx: number) => (
                      <tr key={rIdx}>
                        {Object.values(row).map((val: any, cIdx: number) => (
                          <td key={cIdx} style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {val === null ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>NULL</span> : String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
