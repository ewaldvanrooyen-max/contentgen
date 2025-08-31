'use client';
import { useState } from 'react';

export default function HomePage() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);
      setResult(data.text);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '40px auto', padding: '0 16px', fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>ContentGen: Completion demo</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type something brilliant (<= 500 chars)…"
          rows={6}
          style={{ padding: 12, borderRadius: 8, border: '1px solid #ccc', resize: 'vertical' }}
        />
        <button
          type="submit"
          disabled={loading || prompt.trim().length === 0}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: '1px solid #222',
            background: loading ? '#eee' : '#111',
            color: loading ? '#111' : '#fff',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Working…' : 'Submit'}
        </button>
      </form>

      {result && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #d1e7dd', background: '#f0fff4', borderRadius: 8 }}>
          <strong>Result:</strong>
          <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{result}</div>
        </div>
      )}

      {error && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #f5c2c7', background: '#fff5f5', borderRadius: 8 }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </main>
  );
}
