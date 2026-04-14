'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('Please enter your group code');
      return;
    }
    router.push(`/play/${trimmed}`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-emerald-900">Wanderers Golf Day</h1>
        <p className="text-gray-600">2-Man Best Ball Stableford</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
            Enter your group code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(''); }}
            placeholder="e.g. ABC123"
            className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none uppercase"
            maxLength={6}
            autoFocus
          />
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-800 transition-colors"
        >
          Enter Scores
        </button>
      </form>

      <Link
        href="/leaderboard"
        className="text-emerald-700 font-medium hover:underline"
      >
        View Live Leaderboard
      </Link>
    </div>
  );
}
