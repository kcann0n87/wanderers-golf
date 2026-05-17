'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Player, RyderMatch, Score, Settings } from '@/lib/types';
import { STRAITS, RIVER, CourseData } from '@/lib/courses';
import { getStrokesOnHole, getNetScore } from '@/lib/ryder';
import Link from 'next/link';

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: matchId } = use(params);
  const searchParams = useSearchParams();
  const urlPin = searchParams.get('pin');

  const [match, setMatch] = useState<RyderMatch | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeHole, setActiveHole] = useState(1);
  const [saving, setSaving] = useState(false);
  const initialLoadDone = useRef(false);

  const course: CourseData = match?.round === 2 ? RIVER : STRAITS;

  async function fetchData() {
    const { data: matchData } = await supabase
      .from('ryder_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (!matchData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setMatch(matchData as RyderMatch);

    const playerIds = [
      matchData.team1_player1_id,
      matchData.team1_player2_id,
      matchData.team2_player1_id,
      matchData.team2_player2_id,
    ];

    const [pRes, sRes, settRes] = await Promise.all([
      supabase.from('players').select('*').in('id', playerIds),
      supabase.from('scores').select('*').eq('match_id', matchId),
      supabase.from('settings').select('*').single(),
    ]);

    if (pRes.data) setPlayers(pRes.data as Player[]);
    if (sRes.data) setScores(sRes.data as Score[]);
    if (settRes.data) setSettings(settRes.data as Settings);

    if (!initialLoadDone.current && sRes.data) {
      const scoredHoles = new Set(sRes.data.map((s: Score) => s.hole));
      for (let h = 1; h <= 18; h++) {
        if (!scoredHoles.has(h)) {
          setActiveHole(h);
          break;
        }
      }
      initialLoadDone.current = true;
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel(`match-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  function getScore(playerId: string, hole: number): Score | undefined {
    return scores.find(s => s.player_id === playerId && s.hole === hole);
  }

  function getPlayerCH(player: Player): number {
    return match?.round === 2 ? (player.course_handicap_river || 0) : (player.course_handicap_straits || 0);
  }

  async function saveScore(playerId: string, hole: number, gross: number) {
    setSaving(true);
    const existing = getScore(playerId, hole);
    if (existing) {
      await supabase.from('scores').update({ gross_score: gross }).eq('id', existing.id);
    } else {
      await supabase.from('scores').insert({ player_id: playerId, match_id: matchId, hole, gross_score: gross });
    }
    await fetchData();
    setSaving(false);
  }

  async function clearScore(playerId: string, hole: number) {
    const existing = getScore(playerId, hole);
    if (existing) {
      await supabase.from('scores').delete().eq('id', existing.id);
      await fetchData();
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" /></div>;
  }

  if (notFound) {
    return <div className="text-center py-12"><h2 className="text-xl font-bold text-red-600">Match not found</h2><Link href="/" className="text-blue-700 hover:underline">Go back</Link></div>;
  }

  if (match?.pin && urlPin !== match.pin) {
    return <div className="text-center py-12"><h2 className="text-xl font-bold text-red-600">Unauthorized</h2><Link href="/" className="text-blue-700 hover:underline">Go back and enter your PIN</Link></div>;
  }

  if (!settings?.scoring_open) {
    return <div className="text-center py-12"><h2 className="text-xl font-bold text-gray-600">Scoring is closed</h2><Link href="/leaderboard" className="text-blue-700 hover:underline">View Leaderboard</Link></div>;
  }

  const par = course.pars[activeHole - 1];
  const si = course.strokeIndex[activeHole - 1];

  // Order players: team1 first, then team2
  const team1 = players.filter(p => p.id === match?.team1_player1_id || p.id === match?.team1_player2_id);
  const team2 = players.filter(p => p.id === match?.team2_player1_id || p.id === match?.team2_player2_id);

  const roundLabel = match?.round === 1 ? 'R1: Straits — Best Ball' : 'R2: River — High/Low';

  return (
    <div className="space-y-4">
      {/* Match header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500 uppercase">{roundLabel} — Match {match?.match_number}</div>
            <div className="font-bold mt-1">
              <span className="text-red-700">{team1.map(p => p.name).join(' & ')}</span>
              <span className="text-gray-400 mx-2">vs</span>
              <span className="text-blue-700">{team2.map(p => p.name).join(' & ')}</span>
            </div>
          </div>
          <button
            onClick={() => { sessionStorage.setItem('scoringUrl', window.location.href); window.location.href = '/leaderboard'; }}
            className="px-4 py-2 bg-blue-900 text-white text-sm font-medium rounded-lg hover:bg-blue-950"
          >
            Leaderboard
          </button>
        </div>
      </div>

      {/* Hole selector */}
      <div className="bg-white rounded-lg shadow p-3">
        <div className="grid grid-cols-9 gap-1 text-center">
          {Array.from({ length: 18 }, (_, i) => i + 1).map(h => {
            const allScored = [...team1, ...team2].every(p => getScore(p.id, h));
            return (
              <button key={h} onClick={() => setActiveHole(h)}
                className={`py-2 rounded text-sm font-medium transition-colors ${
                  h === activeHole ? 'bg-blue-900 text-white' :
                  allScored ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {h}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scoring */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Hole {activeHole}</h2>
          <div className="flex gap-3 text-sm text-gray-500">
            <span>Par {par}</span>
            <span>SI {si}</span>
          </div>
        </div>

        {[{ label: 'Team Jordan', color: 'text-red-700', players: team1 }, { label: 'Team Nolan', color: 'text-blue-700', players: team2 }].map(({ label, color, players: teamPlayers }) => (
          <div key={label} className="space-y-2">
            <div className={`text-xs font-semibold uppercase tracking-wide border-b pb-1 ${color}`}>{label}</div>
            {teamPlayers.map(player => {
              const ch = getPlayerCH(player);
              const strokes = getStrokesOnHole(ch, si);
              const existing = getScore(player.id, activeHole);
              const currentGross = existing?.gross_score;

              const displayScore = currentGross || par;
              const net = currentGross ? getNetScore(currentGross, ch, si) : null;
              const diff = currentGross ? currentGross - par : 0;
              const label2 = diff <= -2 ? 'Eagle' : diff === -1 ? 'Birdie' : diff === 0 ? 'Par' : diff === 1 ? 'Bogey' : diff === 2 ? 'Double' : `+${diff}`;

              return (
                <div key={player.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">{player.name}</span>
                      <span className="text-xs text-gray-400 ml-2">CH {ch}</span>
                      {strokes > 0 && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">+{strokes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const newScore = currentGross ? Math.max(1, currentGross - 1) : par - 1;
                        if (newScore >= 1) saveScore(player.id, activeHole, newScore);
                      }}
                      disabled={saving}
                      className="w-14 h-14 rounded-xl bg-blue-100 text-blue-700 text-2xl font-bold hover:bg-blue-200 active:bg-blue-300 disabled:opacity-30"
                    >−</button>
                    <div className={`flex-1 text-center border-2 rounded-xl py-2 ${currentGross ? 'bg-gray-50 border-gray-200' : 'bg-gray-50 border-dashed border-gray-300'}`}>
                      <div className="text-3xl font-bold">{currentGross || '—'}</div>
                      <div className="text-xs font-semibold text-gray-500">
                        {currentGross ? `${label2}${net !== null ? ` · Net ${net}` : ''}` : `Tap + for Par, − for Birdie`}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newScore = currentGross ? Math.min(12, currentGross + 1) : par;
                        saveScore(player.id, activeHole, newScore);
                      }}
                      disabled={saving}
                      className="w-14 h-14 rounded-xl bg-red-100 text-red-700 text-2xl font-bold hover:bg-red-200 active:bg-red-300 disabled:opacity-30"
                    >+</button>
                    {currentGross && (
                      <button onClick={() => clearScore(player.id, activeHole)}
                        className="w-10 h-10 rounded-lg text-xs text-red-500 border border-red-200 hover:bg-red-50">X</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        <div className="flex justify-between pt-2">
          <button onClick={() => setActiveHole(Math.max(1, activeHole - 1))} disabled={activeHole === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-30">Prev</button>
          <button onClick={() => setActiveHole(Math.min(18, activeHole + 1))} disabled={activeHole === 18}
            className="px-4 py-2 bg-blue-900 text-white rounded-lg disabled:opacity-30">Next Hole</button>
        </div>
      </div>
    </div>
  );
}
