'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, Team, Score, Settings } from '@/lib/types';
import { PARS, STROKE_INDEX } from '@/lib/course';
import { getStrokesOnHole, getStablefordPoints } from '@/lib/stableford';
import Link from 'next/link';

interface TeamWithPlayers extends Team {
  foursome: number | null;
}

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [teams, setTeams] = useState<TeamWithPlayers[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeHole, setActiveHole] = useState(1);
  const [saving, setSaving] = useState(false);

  async function fetchData() {
    // Find team by code
    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('group_code', code.toUpperCase())
      .single();

    if (!teamData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Find all teams in same foursome
    let foursomeTeams: TeamWithPlayers[] = [teamData as TeamWithPlayers];
    if (teamData.foursome) {
      const { data: pairedTeams } = await supabase
        .from('teams')
        .select('*')
        .eq('foursome', teamData.foursome)
        .order('name');
      if (pairedTeams) foursomeTeams = pairedTeams as TeamWithPlayers[];
    }

    setTeams(foursomeTeams);

    const teamIds = foursomeTeams.map(t => t.id);

    const [pRes, settRes] = await Promise.all([
      supabase.from('players').select('*, tee:tees(*)').in('team_id', teamIds).order('name'),
      supabase.from('settings').select('*').single(),
    ]);

    const allPlayers = (pRes.data || []) as unknown as Player[];
    setPlayers(allPlayers);

    // Fetch scores for all players in the foursome
    const playerIds = allPlayers.map(p => p.id);
    if (playerIds.length > 0) {
      const { data: scoreData } = await supabase
        .from('scores')
        .select('*')
        .in('player_id', playerIds);
      if (scoreData) setScores(scoreData as Score[]);
    }

    if (settRes.data) setSettings(settRes.data as Settings);

    // Set active hole to the first hole without all scores
    if (allPlayers.length > 0) {
      const { data: scoreData } = await supabase
        .from('scores')
        .select('*')
        .in('player_id', playerIds);
      const scoredHoles = new Set((scoreData || []).map((s: Score) => s.hole));
      for (let h = 1; h <= 18; h++) {
        if (!scoredHoles.has(h)) {
          setActiveHole(h);
          break;
        }
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel(`play-${code}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [code]);

  function getScoreForHole(playerId: string, hole: number): Score | undefined {
    return scores.find(s => s.player_id === playerId && s.hole === hole);
  }

  function getPlayerTotal(playerId: string): number {
    const player = players.find(p => p.id === playerId);
    if (!player) return 0;
    return scores
      .filter(s => s.player_id === playerId)
      .reduce((total, s) => total + getStablefordPoints(s.gross_score, s.hole - 1, player.handicap), 0);
  }

  function getPlayerThru(playerId: string): number {
    return scores.filter(s => s.player_id === playerId).length;
  }

  async function saveScore(playerId: string, hole: number, gross: number) {
    setSaving(true);
    const existing = getScoreForHole(playerId, hole);
    if (existing) {
      await supabase.from('scores').update({ gross_score: gross }).eq('id', existing.id);
    } else {
      await supabase.from('scores').insert({ player_id: playerId, hole, gross_score: gross });
    }
    await fetchData();
    setSaving(false);
  }

  async function clearScore(playerId: string, hole: number) {
    const existing = getScoreForHole(playerId, hole);
    if (existing) {
      await supabase.from('scores').delete().eq('id', existing.id);
      await fetchData();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-xl font-bold text-red-600">Group not found</h2>
        <p className="text-gray-600">Code &quot;{code}&quot; doesn&apos;t match any team.</p>
        <Link href="/" className="text-emerald-700 hover:underline">Go back</Link>
      </div>
    );
  }

  if (!settings?.scoring_open) {
    return (
      <div className="text-center py-12 space-y-4">
        <h2 className="text-xl font-bold text-gray-600">Scoring is closed</h2>
        <Link href="/leaderboard" className="text-emerald-700 hover:underline">View Leaderboard</Link>
      </div>
    );
  }

  const par = PARS[activeHole - 1];
  const si = STROKE_INDEX[activeHole - 1];

  return (
    <div className="space-y-4">
      {/* Foursome header */}
      <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {teams.length > 1 ? `Foursome ${teams[0]?.foursome}` : teams[0]?.name}
          </h1>
          <p className="text-sm text-gray-500">
            {teams.map(t => t.name).join(' + ')}
          </p>
        </div>
        <Link href="/leaderboard" className="text-emerald-700 text-sm hover:underline">
          Leaderboard
        </Link>
      </div>

      {/* Hole selector */}
      <div className="bg-white rounded-lg shadow p-3">
        <div className="grid grid-cols-9 gap-1 text-center">
          {Array.from({ length: 18 }, (_, i) => i + 1).map(h => {
            const hasScore = players.every(p => getScoreForHole(p.id, h));
            return (
              <button
                key={h}
                onClick={() => setActiveHole(h)}
                className={`py-2 rounded text-sm font-medium transition-colors ${
                  h === activeHole
                    ? 'bg-emerald-700 text-white'
                    : hasScore
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {h}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active hole scoring — grouped by team */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Hole {activeHole}</h2>
          <div className="flex gap-3 text-sm text-gray-500">
            <span>Par {par}</span>
            <span>SI {si}</span>
          </div>
        </div>

        {teams.map(team => {
          const teamPlayers = players.filter(p => p.team_id === team.id);
          return (
            <div key={team.id} className="space-y-2">
              <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide border-b pb-1">
                {team.name}
              </div>
              {teamPlayers.map(player => {
                const existing = getScoreForHole(player.id, activeHole);
                const strokes = getStrokesOnHole(player.handicap, activeHole - 1);
                const currentGross = existing?.gross_score;

                return (
                  <div key={player.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium">{player.name}</span>
                        <span className="text-xs text-gray-400 ml-2">Hcp {player.handicap}</span>
                        {strokes > 0 && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                            +{strokes} stroke{strokes > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        <span className="font-bold text-emerald-700">{getPlayerTotal(player.id)}</span> pts
                        <span className="ml-1 text-xs">({getPlayerThru(player.id)})</span>
                      </div>
                    </div>

                    {/* Score buttons */}
                    <div className="flex gap-1.5 flex-wrap">
                      {Array.from({ length: 10 }, (_, i) => i + 1).map(score => {
                        const pts = getStablefordPoints(score, activeHole - 1, player.handicap);
                        const isSelected = currentGross === score;
                        let bgColor = 'bg-gray-100 hover:bg-gray-200';
                        if (isSelected) {
                          if (pts === 0) bgColor = 'bg-red-500 text-white';
                          else if (pts === 1) bgColor = 'bg-orange-400 text-white';
                          else if (pts === 2) bgColor = 'bg-gray-600 text-white';
                          else if (pts === 3) bgColor = 'bg-blue-500 text-white';
                          else bgColor = 'bg-purple-600 text-white';
                        }

                        return (
                          <button
                            key={score}
                            onClick={() => saveScore(player.id, activeHole, score)}
                            disabled={saving}
                            className={`w-10 h-10 rounded-lg font-bold text-sm transition-colors ${bgColor} disabled:opacity-50`}
                          >
                            {score}
                          </button>
                        );
                      })}
                      {currentGross && (
                        <button
                          onClick={() => clearScore(player.id, activeHole)}
                          className="w-10 h-10 rounded-lg text-xs text-red-500 border border-red-200 hover:bg-red-50"
                        >
                          X
                        </button>
                      )}
                    </div>

                    {/* Points feedback */}
                    {currentGross && (
                      <div className="text-sm">
                        Gross {currentGross} → Net {currentGross - strokes} →{' '}
                        <span className="font-bold">
                          {getStablefordPoints(currentGross, activeHole - 1, player.handicap)} pts
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Navigation */}
        <div className="flex justify-between pt-2">
          <button
            onClick={() => setActiveHole(Math.max(1, activeHole - 1))}
            disabled={activeHole === 1}
            className="px-4 py-2 bg-gray-200 rounded-lg disabled:opacity-30"
          >
            Prev
          </button>
          <button
            onClick={() => setActiveHole(Math.min(18, activeHole + 1))}
            disabled={activeHole === 18}
            className="px-4 py-2 bg-emerald-700 text-white rounded-lg disabled:opacity-30"
          >
            Next Hole
          </button>
        </div>
      </div>

      {/* Scorecard summary — grouped by team */}
      {teams.map(team => {
        const teamPlayers = players.filter(p => p.team_id === team.id);
        return (
          <div key={team.id} className="bg-white rounded-lg shadow p-4 overflow-x-auto">
            <h3 className="font-semibold mb-2">{team.name}</h3>
            <table className="w-full text-xs text-center">
              <thead>
                <tr className="border-b">
                  <th className="py-1 text-left pr-2">Hole</th>
                  {Array.from({ length: 18 }, (_, i) => (
                    <th key={i} className="py-1 w-7">{i + 1}</th>
                  ))}
                  <th className="py-1 pl-2 font-bold">Tot</th>
                </tr>
                <tr className="border-b text-gray-400">
                  <td className="py-1 text-left pr-2">Par</td>
                  {PARS.map((p, i) => <td key={i} className="py-1">{p}</td>)}
                  <td className="py-1 pl-2">72</td>
                </tr>
              </thead>
              <tbody>
                {teamPlayers.map(player => (
                  <tr key={player.id} className="border-b last:border-0">
                    <td className="py-1 text-left pr-2 font-medium truncate max-w-[80px]">{player.name}</td>
                    {Array.from({ length: 18 }, (_, i) => {
                      const s = getScoreForHole(player.id, i + 1);
                      const pts = s ? getStablefordPoints(s.gross_score, i, player.handicap) : null;
                      let color = '';
                      if (pts !== null) {
                        if (pts === 0) color = 'text-red-500';
                        else if (pts === 1) color = 'text-orange-500';
                        else if (pts === 2) color = '';
                        else if (pts >= 3) color = 'text-blue-600 font-bold';
                      }
                      return (
                        <td key={i} className={`py-1 ${color}`}>
                          {s ? s.gross_score : '—'}
                        </td>
                      );
                    })}
                    <td className="py-1 pl-2 font-bold text-emerald-700">{getPlayerTotal(player.id)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
