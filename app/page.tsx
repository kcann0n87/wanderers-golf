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

    // Find a team with this PIN
    const { data } = await supabase
      .from('teams')
      .select('group_code')
      .eq('pin', pin)
      .limit(1)
      .single();

    if (!data) {
      setError('Invalid PIN');
      setLoading(false);
      return;
    }

    router.push(`/play/${data.group_code}?pin=${pin}`);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-emerald-900">Wanderers Golf Day</h1>
        <p className="text-gray-600">2-Man Best Ball Stableford</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <div>
          <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
            Enter your group PIN
          </label>
          <input
            id="pin"
            type="tel"
            inputMode="numeric"
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(''); }}
            placeholder="0000"
            className="w-full px-4 py-3 text-center text-3xl font-mono tracking-[0.5em] border-2 border-gray-300 rounded-lg focus:border-emerald-600 focus:outline-none"
            maxLength={4}
            autoFocus
          />
          {error && <p className="text-red-600 text-sm mt-1">{error}</p>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-emerald-700 text-white font-semibold rounded-lg hover:bg-emerald-800 transition-colors disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Enter Scores'}
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
