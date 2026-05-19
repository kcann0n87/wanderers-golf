'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, RyderMatch, Score } from '@/lib/types';
import { STRAITS, RIVER } from '@/lib/courses';
import { calcBestBallMatch, calcHighLowMatch, bestBallPoints, formatMatchStatus } from '@/lib/ryder';

export default function LeaderboardPage() {
  const [matches, setMatches] = useState<RyderMatch[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoringUrl, setScoringUrl] = useState<string | null>(null);

  async function fetchData() {
    const [mRes, pRes, sRes] = await Promise.all([
      supabase.from('ryder_matches').select('*').order('round').order('match_number'),
      supabase.from('players').select('*').not('ryder_team', 'is', null),
      supabase.from('scores').select('*'),
    ]);
    if (mRes.data) setMatches(mRes.data as RyderMatch[]);
    if (pRes.data) setPlayers(pRes.data as Player[]);
    if (sRes.data) setScores(sRes.data as Score[]);
    setLoading(false);
  }

  useEffect(() => {
    setScoringUrl(sessionStorage.getItem('scoringUrl'));
    fetchData();
    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'scores' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ryder_matches' }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900" /></div>;
  }

  const r1Matches = matches.filter(m => m.round === 1);
  const r2Matches = matches.filter(m => m.round === 2);

  // Calculate R1 totals
  let r1JordanTotal = 0;
  let r1NolanTotal = 0;
  const r1Results = r1Matches.map(m => {
    const matchScores = scores.filter(s => s.match_id === m.id);
    const result = calcBestBallMatch(m, matchScores, STRAITS, players);
    const complete = result.thru === 18;
    const pts = bestBallPoints(result.status, complete);
    if (pts) { r1JordanTotal += pts.team1; r1NolanTotal += pts.team2; }
    return { match: m, result, pts, complete };
  });

  // Calculate R2 totals
  let r2JordanTotal = 0;
  let r2NolanTotal = 0;
  const r2Results = r2Matches.map(m => {
    const matchScores = scores.filter(s => s.match_id === m.id);
    const result = calcHighLowMatch(m, matchScores, RIVER, players);
    r2JordanTotal += result.team1Points;
    r2NolanTotal += result.team2Points;
    return { match: m, result };
  });

  const totalJordan = r1JordanTotal + r2JordanTotal;
  const totalNolan = r1NolanTotal + r2NolanTotal;

  return (
    <div className="space-y-4">
      {scoringUrl && (
        <button onClick={() => window.location.href = scoringUrl}
          className="w-full py-3 bg-blue-900 text-white font-semibold rounded-lg hover:bg-blue-950">
          Back to Scoring
        </button>
      )}

      {/* Overall Score */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-center text-sm text-gray-500 uppercase tracking-wide mb-4">Tournament Score</h2>
        <div className="flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-xs uppercase tracking-wide text-red-700 font-bold">Team Jordan</div>
            <div className="text-5xl font-bold text-red-700">{totalJordan}</div>
          </div>
          <div className="text-3xl font-bold text-gray-300">—</div>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wide text-blue-700 font-bold">Team Nolan</div>
            <div className="text-5xl font-bold text-blue-700">{totalNolan}</div>
          </div>
        </div>
        <div className="text-center mt-2 text-xs text-gray-400">
          R1: {r1JordanTotal}–{r1NolanTotal} | R2: {r2JordanTotal}–{r2NolanTotal}
        </div>
      </div>

      {/* R1: Straits Best Ball */}
      {r1Results.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold mb-3">R1: The Straits — Best Ball (10/5/0)</h3>
          <div className="space-y-2">
            {r1Results.map(({ match: m, result, pts, complete }) => {
              const p1 = players.find(p => p.id === m.team1_player1_id);
              const p2 = players.find(p => p.id === m.team1_player2_id);
              const p3 = players.find(p => p.id === m.team2_player1_id);
              const p4 = players.find(p => p.id === m.team2_player2_id);

              let statusText = formatMatchStatus(result.status, result.thru);
              let statusColor = 'text-emerald-600 font-bold';
              if (result.status > 0) { statusColor = 'text-red-700'; statusText = `${result.team1Label} ${statusText}`; }
              else if (result.status < 0) { statusColor = 'text-blue-700'; statusText = `${result.team2Label} ${statusText}`; }

              return (
                <div key={m.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-red-700 font-medium">{p1?.name} & {p2?.name}</span>
                      <span className="text-gray-400 mx-2">vs</span>
                      <span className="text-blue-700 font-medium">{p3?.name} & {p4?.name}</span>
                    </div>
                    {pts && (
                      <div className="text-xs">
                        <span className="text-red-700 font-bold">{pts.team1}</span>
                        <span className="text-gray-400 mx-1">–</span>
                        <span className="text-blue-700 font-bold">{pts.team2}</span>
                      </div>
                    )}
                  </div>
                  <div className={`text-sm font-semibold mt-1 ${statusColor}`}>
                    {statusText}
                  </div>
                </div>
              );
            })}
            <div className="flex justify-between text-sm font-bold pt-2 border-t">
              <span className="text-red-700">Team Jordan: {r1JordanTotal}</span>
              <span className="text-blue-700">Team Nolan: {r1NolanTotal}</span>
            </div>
          </div>
        </div>
      )}

      {/* R2: River High/Low */}
      {r2Results.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-bold mb-3">R2: The River — High/Low (2 pts/hole)</h3>
          <div className="space-y-2">
            {r2Results.map(({ match: m, result }) => {
              const p1 = players.find(p => p.id === m.team1_player1_id);
              const p2 = players.find(p => p.id === m.team1_player2_id);
              const p3 = players.find(p => p.id === m.team2_player1_id);
              const p4 = players.find(p => p.id === m.team2_player2_id);

              return (
                <div key={m.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-red-700 font-medium">{p1?.name} & {p2?.name}</span>
                      <span className="text-gray-400 mx-2">vs</span>
                      <span className="text-blue-700 font-medium">{p3?.name} & {p4?.name}</span>
                    </div>
                    <div className="text-sm font-bold">
                      <span className="text-red-700">{result.team1Points}</span>
                      <span className="text-gray-400 mx-1">–</span>
                      <span className="text-blue-700">{result.team2Points}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {result.thru === 0 ? 'Not started' : `Thru ${result.thru} · ${result.team1Points + result.team2Points} of ${result.thru * 2} pts awarded`}
                  </div>
                </div>
              );
            })}
            <div className="flex justify-between text-sm font-bold pt-2 border-t">
              <span className="text-red-700">Team Jordan: {r2JordanTotal}</span>
              <span className="text-blue-700">Team Nolan: {r2NolanTotal}</span>
            </div>
          </div>
        </div>
      )}

      {matches.length === 0 && (
        <div className="text-center py-12 text-gray-400">No matches set up yet.</div>
      )}
    </div>
  );
}
