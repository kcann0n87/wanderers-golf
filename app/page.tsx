'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function Home() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 4) {
      setError('Enter your 4-digit PIN');
      return;
    }
    setLoading(true);
    setError('');

    const { data } = await supabase
      .from('ryder_matches')
      .select('id')
      .eq('pin', pin)
      .limit(1)
      .single();

    if (!data) {
      setError('Invalid PIN');
      setLoading(false);
      return;
    }

    router.push(`/play/${data.id}?pin=${pin}`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-blue-950">Whistling 2026</h1>
        <p className="text-gray-600">Team Jordan vs Team Nolan</p>
      </div>

      <div className="flex gap-6 text-center">
        <div className="bg-red-700 text-white px-6 py-3 rounded-lg">
          <div className="text-xs uppercase tracking-wide opacity-80">Team</div>
          <div className="text-xl font-bold">Jordan</div>
        </div>
        <div className="text-2xl font-bold text-gray-400 self-center">vs</div>
        <div className="bg-blue-700 text-white px-6 py-3 rounded-lg">
          <div className="text-xs uppercase tracking-wide opacity-80">Team</div>
          <div className="text-xl font-bold">Nolan</div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
            Enter your match PIN
          </label>
          <input
            id="pin"
            type="tel"
            inputMode="numeric"
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
            placeholder="0000"
            className="w-full px-4 py-3 text-center text-3xl font-mono tracking-[0.5em] border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
            maxLength={4}
            autoFocus
          />
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-950 transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Enter Scores'}
        </button>
      </form>

      <Link href="/leaderboard" className="text-blue-800 font-medium hover:underline">
        View Live Leaderboard
      </Link>
    </div>
  );
}
