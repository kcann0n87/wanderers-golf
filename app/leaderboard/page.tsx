'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, Team, Score, TeamResult } from '@/lib/types';
import { buildPlayerRound, buildTeamResult, getStablefordPoints } from '@/lib/stableford';
import { PARS } from '@/lib/course';

export default function LeaderboardPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIndividual, setShowIndividual] = useState(false);
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

  async function fetchData() {
    const [tRes, pRes, sRes] = await Promise.all([
      supabase.from('teams').select('*').order('name'),
      supabase.from('players').select('*, tee:tees(*)').order('name'),
      supabase.from('scores').select('*'),
    ]);
    if (tRes.data) setTeams(tRes.data as Team[]);
    if (pRes.data) setPlayers(pRes.data as unknown as Player[]);
    if (sRes.data) setScores(sRes.data as Score[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Build team results
  const teamResults: TeamResult[] = teams
    .map(team => {
      const teamPlayers = players.filter(p => p.team_id === team.id);
      if (teamPlayers.length < 2) return null;
      const p1Scores = scores.filter(s => s.player_id === teamPlayers[0].id);
      const p2Scores = scores.filter(s => s.player_id === teamPlayers[1].id);
      const p1Round = buildPlayerRound(teamPlayers[0], p1Scores);
      const p2Round = buildPlayerRound(teamPlayers[1], p2Scores);
      return buildTeamResult(team, p1Round, p2Round);
    })
    .filter((r): r is TeamResult => r !== null)
    .sort((a, b) => b.bestBallTotal - a.bestBallTotal);

  // Build individual results
  const individualResults = players
    .map(player => {
      const playerScores = scores.filter(s => s.player_id === player.id);
      return buildPlayerRound(player, playerScores);
    })
    .sort((a, b) => b.totalStableford - a.totalStableford);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live Leaderboard</h1>
        <div className="flex bg-gray-200 rounded-lg p-0.5">
          <button
            onClick={() => setShowIndividual(false)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !showIndividual ? 'bg-white shadow text-emerald-800' : 'text-gray-500'
            }`}
          >
            Teams
          </button>
          <button
            onClick={() => setShowIndividual(true)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              showIndividual ? 'bg-white shadow text-emerald-800' : 'text-gray-500'
            }`}
          >
            Individual
          </button>
        </div>
      </div>

      {!showIndividual ? (
        /* Team Leaderboard */
        <div className="space-y-2">
          {teamResults.map((result, idx) => (
            <div key={result.team.id} className="bg-white rounded-lg shadow overflow-hidden">
              <button
                onClick={() => setExpandedTeam(expandedTeam === result.team.id ? null : result.team.id)}
                className="w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx === 0 ? 'bg-yellow-400 text-yellow-900' :
                  idx === 1 ? 'bg-gray-300 text-gray-700' :
                  idx === 2 ? 'bg-amber-600 text-amber-100' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {idx + 1}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold">{result.team.name}</div>
                  <div className="text-xs text-gray-500">
                    {result.player1.player.name} & {result.player2.player.name}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-700">{result.bestBallTotal}</div>
                  <div className="text-xs text-gray-400">
                    thru {result.thruHole}
                  </div>
                </div>
              </button>

              {expandedTeam === result.team.id && (
                <div className="border-t px-4 pb-4 pt-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center">
                      <thead>
                        <tr className="border-b">
                          <th className="py-1 text-left pr-2">Hole</th>
                          {Array.from({ length: 18 }, (_, i) => (
                            <th key={i} className="py-1 w-6">{i + 1}</th>
                          ))}
                          <th className="py-1 pl-1">Tot</th>
                        </tr>
                        <tr className="border-b text-gray-400">
                          <td className="py-1 text-left pr-2">Par</td>
                          {PARS.map((p, i) => <td key={i}>{p}</td>)}
                          <td className="pl-1">72</td>
                        </tr>
                      </thead>
                      <tbody>
                        {[result.player1, result.player2].map(pr => (
                          <tr key={pr.player.id} className="border-b">
                            <td className="py-1 text-left pr-2 truncate max-w-[70px]">
                              {pr.player.name} <span className="text-gray-400">({pr.player.handicap})</span>
                            </td>
                            {Array.from({ length: 18 }, (_, i) => {
                              const s = pr.scores[i];
                              if (!s) return <td key={i} className="text-gray-300">—</td>;
                              const pts = getStablefordPoints(s.gross_score, i, pr.player.handicap);
                              let color = '';
                              if (pts === 0) color = 'text-red-500';
                              else if (pts === 1) color = 'text-orange-500';
                              else if (pts >= 3) color = 'text-blue-600 font-bold';
                              return <td key={i} className={color}>{s.gross_score}</td>;
                            })}
                            <td className="pl-1 font-bold">{pr.totalStableford}</td>
                          </tr>
                        ))}
                        <tr className="font-bold text-emerald-700">
                          <td className="py-1 text-left pr-2">Best Ball</td>
                          {result.bestBallByHole.map((pts, i) => (
                            <td key={i}>{i < result.thruHole ? pts : '—'}</td>
                          ))}
                          <td className="pl-1">{result.bestBallTotal}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}

          {teamResults.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No teams with scores yet. Waiting for scores to come in...
            </div>
          )}
        </div>
      ) : (
        /* Individual Leaderboard */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-gray-500">
                <th className="p-3 w-10">#</th>
                <th className="p-3">Player</th>
                <th className="p-3 text-center">Hcp</th>
                <th className="p-3 text-center">Thru</th>
                <th className="p-3 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {individualResults.map((pr, idx) => (
                <tr key={pr.player.id} className="border-b last:border-0">
                  <td className="p-3 font-medium text-gray-400">{idx + 1}</td>
                  <td className="p-3 font-medium">{pr.player.name}</td>
                  <td className="p-3 text-center text-gray-500">{pr.player.handicap}</td>
                  <td className="p-3 text-center text-gray-500">{pr.thruHole}</td>
                  <td className="p-3 text-right font-bold text-emerald-700">{pr.totalStableford}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {individualResults.length === 0 && (
            <div className="text-center py-12 text-gray-400">No scores yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
