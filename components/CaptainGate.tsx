'use client';

import { useState, ReactNode } from 'react';

export default function CaptainGate({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, role: 'captain' }),
    });
    if (res.ok) {
      setAuthed(true);
    } else {
      setError('Wrong password');
    }
    setLoading(false);
  }

  if (authed) return <>{children}</>;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <h2 className="text-xl font-bold text-center">Captain Login</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Captain password"
          className="w-full px-4 py-2 border rounded-lg focus:border-blue-600 focus:outline-none"
          autoFocus
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
