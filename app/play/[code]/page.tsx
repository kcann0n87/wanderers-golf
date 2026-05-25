'use client';

import { useEffect, useState, useRef, use } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Player, RyderMatch, Score, Settings } from '@/lib/types';
import { STRAITS, RIVER, CourseData } from '@/lib/courses';
import { getStrokesOnHole, getNetScore, getAdjustedHandicaps, calcBestBallMatch, calcHighLowMatch, formatMatchStatus } from '@/lib/ryder';
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
  const [showScorecard, setShowScorecard] = useState(false);

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

  // Get adjusted handicaps (zeroed off lowest in the match)
  const adjustedCH = match && players.length === 4
    ? getAdjustedHandicaps(match, players, match.round)
    : {};

  function getPlayerCH(player: Player): number {
    return adjustedCH[player.id] || 0;
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
            {/* Live match score */}
            {match && players.length === 4 && (() => {
              if (match.round === 1) {
                const r = calcBestBallMatch(match, scores, course, players);
                if (r.thru === 0) return null;
                const statusText = formatMatchStatus(r.status, r.thru, r.clinched);
                let color = 'text-emerald-700';
                let label = statusText;
                if (r.status > 0) { color = 'text-red-700'; label = `${r.team1Label} ${r.clinched ? 'WIN ' : ''}${statusText}`; }
                else if (r.status < 0) { color = 'text-blue-700'; label = `${r.team2Label} ${r.clinched ? 'WIN ' : ''}${statusText}`; }
                return <div className={`text-sm font-bold mt-1 ${color}`}>{label}</div>;
              } else {
                const r = calcHighLowMatch(match, scores, course, players);
                if (r.thru === 0) return null;
                const diff = r.team1Points - r.team2Points;
                let color = 'text-emerald-700';
                let label = `Tied ${r.team1Points}–${r.team2Points}`;
                if (diff > 0) { color = 'text-red-700'; label = `${team1.map(p => p.name.split(' ')[0]).join('/')} lead ${r.team1Points}–${r.team2Points}`; }
                else if (diff < 0) { color = 'text-blue-700'; label = `${team2.map(p => p.name.split(' ')[0]).join('/')} lead ${r.team2Points}–${r.team1Points}`; }
                return <div className={`text-sm font-bold mt-1 ${color}`}>{label} thru {r.thru}</div>;
              }
            })()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowScorecard(!showScorecard)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${showScorecard ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Scorecard
            </button>
            <button
              onClick={() => { sessionStorage.setItem('scoringUrl', window.location.href); window.location.href = '/leaderboard'; }}
              className="px-3 py-2 bg-blue-900 text-white text-sm font-medium rounded-lg hover:bg-blue-950"
            >
              Leaderboard
            </button>
          </div>
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
          <div className="flex gap-3 text-lg font-bold text-black">
            <span>Par {par}</span>
            <span>HCP {si}</span>
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
              const maxScore = Math.max(par + 4, 10);
              const isPickup = currentGross ? currentGross >= maxScore : false;
              const label2 = isPickup ? 'Picked up' : diff <= -2 ? 'Eagle' : diff === -1 ? 'Birdie' : diff === 0 ? 'Par' : diff === 1 ? 'Bogey' : diff === 2 ? 'Double' : `+${diff}`;

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
                    <div className={`flex-1 text-center border-2 rounded-xl py-2 ${isPickup ? 'bg-gray-200 border-gray-400' : currentGross ? 'bg-gray-50 border-gray-200' : 'bg-gray-50 border-dashed border-gray-300'}`}>
                      <div className="text-3xl font-bold">{isPickup ? 'X' : currentGross || '—'}</div>
                      <div className={`text-xs font-semibold ${isPickup ? 'text-gray-600' : 'text-gray-500'}`}>
                        {isPickup ? 'Picked up' : currentGross ? `${label2}${net !== null ? ` · Net ${net}` : ''}` : `Tap + for Par, − for Birdie`}
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
                    <button
                      onClick={() => {
                        const maxScore = Math.max(par + 4, 10);
                        saveScore(player.id, activeHole, maxScore);
                      }}
                      disabled={saving}
                      className={`w-12 h-14 rounded-xl text-sm font-bold transition-colors ${
                        currentGross && currentGross >= Math.max(par + 4, 10)
                          ? 'bg-gray-800 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      } disabled:opacity-30`}
                    >X</button>
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

      {/* Scorecard */}
      {showScorecard && (
        <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
          <h3 className="font-bold mb-3">Scorecard</h3>
          {/* Front 9 */}
          <table className="w-full text-xs text-center mb-4" style={{ minWidth: 500 }}>
            <thead>
              <tr className="border-b">
                <th className="py-1 text-left pr-1 w-16">Hole</th>
                {Array.from({ length: 9 }, (_, i) => (
                  <th key={i} className="py-1">{i + 1}</th>
                ))}
                <th className="py-1 font-bold">OUT</th>
              </tr>
              <tr className="border-b text-gray-400">
                <td className="py-1 text-left pr-1">Par</td>
                {course.pars.slice(0, 9).map((p, i) => <td key={i}>{p}</td>)}
                <td className="font-bold">{course.pars.slice(0, 9).reduce((a, b) => a + b, 0)}</td>
              </tr>
              <tr className="border-b text-gray-400">
                <td className="py-1 text-left pr-1">HCP</td>
                {course.strokeIndex.slice(0, 9).map((h, i) => <td key={i}>{h}</td>)}
                <td></td>
              </tr>
            </thead>
            <tbody>
              {[...team1, ...team2].map((player, idx) => {
                const ch = getPlayerCH(player);
                const isTeam2 = idx >= team1.length;
                const color = isTeam2 ? 'text-blue-700' : 'text-red-700';
                let front9Total = 0;
                return (
                  <tr key={player.id} className="border-b last:border-0">
                    <td className={`py-1 text-left pr-1 font-medium ${color} truncate max-w-[64px]`}>{player.name}</td>
                    {Array.from({ length: 9 }, (_, i) => {
                      const s = getScore(player.id, i + 1);
                      const maxScore = Math.max(course.pars[i] + 4, 10);
                      const isPickup = s && s.gross_score >= maxScore;
                      if (s && !isPickup) front9Total += s.gross_score;
                      const strokes = getStrokesOnHole(ch, course.strokeIndex[i]);
                      return (
                        <td key={i} className="py-1 relative">
                          {s ? (isPickup ? <span className="text-gray-400">X</span> : s.gross_score) : <span className="text-gray-300">—</span>}
                          {strokes > 0 && <span className="absolute -top-0.5 -right-0.5 text-[8px] text-amber-600">●</span>}
                        </td>
                      );
                    })}
                    <td className="font-bold">{front9Total || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {/* Back 9 */}
          <table className="w-full text-xs text-center" style={{ minWidth: 500 }}>
            <thead>
              <tr className="border-b">
                <th className="py-1 text-left pr-1 w-16">Hole</th>
                {Array.from({ length: 9 }, (_, i) => (
                  <th key={i} className="py-1">{i + 10}</th>
                ))}
                <th className="py-1 font-bold">IN</th>
                <th className="py-1 font-bold">TOT</th>
              </tr>
              <tr className="border-b text-gray-400">
                <td className="py-1 text-left pr-1">Par</td>
                {course.pars.slice(9, 18).map((p, i) => <td key={i}>{p}</td>)}
                <td className="font-bold">{course.pars.slice(9, 18).reduce((a, b) => a + b, 0)}</td>
                <td className="font-bold">{course.totalPar}</td>
              </tr>
              <tr className="border-b text-gray-400">
                <td className="py-1 text-left pr-1">HCP</td>
                {course.strokeIndex.slice(9, 18).map((h, i) => <td key={i}>{h}</td>)}
                <td></td>
                <td></td>
              </tr>
            </thead>
            <tbody>
              {[...team1, ...team2].map((player, idx) => {
                const ch = getPlayerCH(player);
                const isTeam2 = idx >= team1.length;
                const color = isTeam2 ? 'text-blue-700' : 'text-red-700';
                let front9Total = 0;
                let back9Total = 0;
                // Calculate front 9 total for grand total
                for (let i = 0; i < 9; i++) {
                  const s = getScore(player.id, i + 1);
                  const maxScore = Math.max(course.pars[i] + 4, 10);
                  if (s && s.gross_score < maxScore) front9Total += s.gross_score;
                }
                return (
                  <tr key={player.id} className="border-b last:border-0">
                    <td className={`py-1 text-left pr-1 font-medium ${color} truncate max-w-[64px]`}>{player.name}</td>
                    {Array.from({ length: 9 }, (_, i) => {
                      const holeIdx = i + 9;
                      const s = getScore(player.id, holeIdx + 1);
                      const maxScore = Math.max(course.pars[holeIdx] + 4, 10);
                      const isPickup = s && s.gross_score >= maxScore;
                      if (s && !isPickup) back9Total += s.gross_score;
                      const strokes = getStrokesOnHole(ch, course.strokeIndex[holeIdx]);
                      return (
                        <td key={i} className="py-1 relative">
                          {s ? (isPickup ? <span className="text-gray-400">X</span> : s.gross_score) : <span className="text-gray-300">—</span>}
                          {strokes > 0 && <span className="absolute -top-0.5 -right-0.5 text-[8px] text-amber-600">●</span>}
                        </td>
                      );
                    })}
                    <td className="font-bold">{back9Total || '—'}</td>
                    <td className="font-bold">{(front9Total + back9Total) || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
