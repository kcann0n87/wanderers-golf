'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, RyderMatch } from '@/lib/types';
import CaptainGate from '@/components/CaptainGate';

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function CaptainDashboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<RyderMatch[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editCHS, setEditCHS] = useState('');
  const [editCHR, setEditCHR] = useState('');

  // Match creation
  const [matchRound, setMatchRound] = useState(1);
  const [t1p1, setT1p1] = useState('');
  const [t1p2, setT1p2] = useState('');
  const [t2p1, setT2p1] = useState('');
  const [t2p2, setT2p2] = useState('');

  async function fetchAll() {
    const [pRes, mRes] = await Promise.all([
      supabase.from('players').select('*').not('ryder_team', 'is', null).order('ryder_team').order('name'),
      supabase.from('ryder_matches').select('*, team1_player1:players!ryder_matches_team1_player1_id_fkey(*), team1_player2:players!ryder_matches_team1_player2_id_fkey(*), team2_player1:players!ryder_matches_team2_player1_id_fkey(*), team2_player2:players!ryder_matches_team2_player2_id_fkey(*)').order('round').order('match_number'),
    ]);
    if (pRes.data) setPlayers(pRes.data as unknown as Player[]);
    if (mRes.data) setMatches(mRes.data as unknown as RyderMatch[]);
  }

  useEffect(() => { fetchAll(); }, []);

  const jordanPlayers = players.filter(p => p.ryder_team === 'jordan');
  const nolanPlayers = players.filter(p => p.ryder_team === 'nolan');

  async function updateHandicaps(playerId: string) {
    await supabase.from('players').update({
      course_handicap_straits: parseInt(editCHS) || 0,
      course_handicap_river: parseInt(editCHR) || 0,
    }).eq('id', playerId);
    setEditingPlayer(null);
    fetchAll();
  }

  async function createMatch(e: React.FormEvent) {
    e.preventDefault();
    if (!t1p1 || !t1p2 || !t2p1 || !t2p2) return;
    const existingMatches = matches.filter(m => m.round === matchRound);
    const matchNum = existingMatches.length + 1;
    await supabase.from('ryder_matches').insert({
      round: matchRound,
      match_number: matchNum,
      team1_player1_id: t1p1,
      team1_player2_id: t1p2,
      team2_player1_id: t2p1,
      team2_player2_id: t2p2,
      pin: generatePin(),
    });
    setT1p1(''); setT1p2(''); setT2p1(''); setT2p2('');
    fetchAll();
  }

  async function deleteMatch(id: string) {
    await supabase.from('scores').delete().eq('match_id', id);
    await supabase.from('ryder_matches').delete().eq('id', id);
    fetchAll();
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Captain Dashboard</h1>

      {/* Players & Handicaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[{ label: 'Team Jordan', color: 'bg-red-700', list: jordanPlayers }, { label: 'Team Nolan', color: 'bg-blue-700', list: nolanPlayers }].map(({ label, color, list }) => (
          <section key={label} className="bg-white rounded-lg shadow p-4">
            <h2 className={`text-white text-sm font-bold px-3 py-1.5 rounded ${color} mb-3`}>{label}</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-1">Name</th>
                  <th className="pb-1 text-center">Straits</th>
                  <th className="pb-1 text-center">River</th>
                  <th className="pb-1"></th>
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-1.5 font-medium">{p.name}</td>
                    {editingPlayer === p.id ? (
                      <>
                        <td className="py-1.5 text-center">
                          <input type="number" value={editCHS} onChange={e => setEditCHS(e.target.value)}
                            className="w-14 px-1 py-0.5 border rounded text-center text-sm" />
                        </td>
                        <td className="py-1.5 text-center">
                          <input type="number" value={editCHR} onChange={e => setEditCHR(e.target.value)}
                            className="w-14 px-1 py-0.5 border rounded text-center text-sm" />
                        </td>
                        <td className="py-1.5 text-right">
                          <button onClick={() => updateHandicaps(p.id)} className="text-blue-600 text-xs mr-1">Save</button>
                          <button onClick={() => setEditingPlayer(null)} className="text-gray-400 text-xs">X</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-1.5 text-center">{p.course_handicap_straits || 0}</td>
                        <td className="py-1.5 text-center">{p.course_handicap_river || 0}</td>
                        <td className="py-1.5 text-right">
                          <button onClick={() => { setEditingPlayer(p.id); setEditCHS(String(p.course_handicap_straits || 0)); setEditCHR(String(p.course_handicap_river || 0)); }}
                            className="text-blue-600 text-xs">Edit</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      {/* Create Match */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Create Match</h2>
        <form onSubmit={createMatch} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Round</label>
            <select value={matchRound} onChange={e => setMatchRound(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg">
              <option value={1}>R1: Straits (Best Ball)</option>
              <option value={2}>R2: River (High/Low)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-xs font-bold text-red-700 uppercase">Team Jordan</div>
              <select value={t1p1} onChange={e => setT1p1(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Player 1...</option>
                {jordanPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={t1p2} onChange={e => setT1p2(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Player 2...</option>
                {jordanPlayers.filter(p => p.id !== t1p1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-bold text-blue-700 uppercase">Team Nolan</div>
              <select value={t2p1} onChange={e => setT2p1(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Player 1...</option>
                {nolanPlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select value={t2p2} onChange={e => setT2p2(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                <option value="">Player 2...</option>
                {nolanPlayers.filter(p => p.id !== t2p1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <button type="submit" className="px-6 py-2 bg-blue-900 text-white rounded-lg hover:bg-blue-950">
            Create Match
          </button>
        </form>
      </section>

      {/* Matches List */}
      {[1, 2].map(round => {
        const roundMatches = matches.filter(m => m.round === round);
        if (roundMatches.length === 0) return null;
        return (
          <section key={round} className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold mb-3">
              {round === 1 ? 'R1: Straits — Best Ball' : 'R2: River — High/Low'}
            </h2>
            <div className="space-y-2">
              {roundMatches.map(m => (
                <div key={m.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium">
                    Match {m.match_number}:{' '}
                    <span className="text-red-700">{m.team1_player1?.name} & {m.team1_player2?.name}</span>
                    {' vs '}
                    <span className="text-blue-700">{m.team2_player1?.name} & {m.team2_player2?.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-mono font-bold text-sm">
                      {m.pin}
                    </div>
                    <button onClick={() => deleteMatch(m.id)} className="text-red-500 hover:text-red-700 text-xs">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function CaptainPage() {
  return (
    <CaptainGate>
      <CaptainDashboard />
    </CaptainGate>
  );
}
