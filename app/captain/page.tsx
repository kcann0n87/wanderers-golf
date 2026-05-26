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
  const [localHandicaps, setLocalHandicaps] = useState<Record<string, { straits: string; river: string }>>({});

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

  function getLocal(p: Player) {
    return localHandicaps[p.id] || { straits: String(p.course_handicap_straits || 0), river: String(p.course_handicap_river || 0) };
  }

  function setLocal(id: string, field: 'straits' | 'river', val: string) {
    setLocalHandicaps(prev => ({
      ...prev,
      [id]: { ...getLocalById(id), [field]: val },
    }));
  }

  function getLocalById(id: string) {
    const p = players.find(pl => pl.id === id);
    return localHandicaps[id] || { straits: String(p?.course_handicap_straits || 0), river: String(p?.course_handicap_river || 0) };
  }

  async function saveHandicap(playerId: string) {
    const local = getLocalById(playerId);
    await supabase.from('players').update({
      course_handicap_straits: parseInt(local.straits) || 0,
      course_handicap_river: parseInt(local.river) || 0,
    }).eq('id', playerId);
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
                </tr>
              </thead>
              <tbody>
                {list.map(p => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-1.5 font-medium">{p.name}</td>
                    <td className="py-1.5 text-center">
                      <input
                        type="number"
                        value={getLocal(p).straits}
                        onChange={e => setLocal(p.id, 'straits', e.target.value)}
                        onBlur={() => saveHandicap(p.id)}
                        className="w-14 px-1 py-0.5 border rounded text-center text-sm"
                      />
                    </td>
                    <td className="py-1.5 text-center">
                      <input
                        type="number"
                        value={getLocal(p).river}
                        onChange={e => setLocal(p.id, 'river', e.target.value)}
                        onBlur={() => saveHandicap(p.id)}
                        className="w-14 px-1 py-0.5 border rounded text-center text-sm"
                      />
                    </td>
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
              <option value={3}>R3: Irish (Nassau)</option>
            </select>
          </div>
          {(() => {
            const side1 = matchRound === 3 ? players : jordanPlayers;
            const side2 = matchRound === 3 ? players : nolanPlayers;
            const label1 = matchRound === 3 ? 'Team 1' : 'Team Jordan';
            const label2 = matchRound === 3 ? 'Team 2' : 'Team Nolan';
            const selectedIds = [t1p1, t1p2, t2p1, t2p2].filter(Boolean);
            return (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-red-700 uppercase">{label1}</div>
                <select value={t1p1} onChange={e => setT1p1(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Player 1...</option>
                  {side1.filter(p => !selectedIds.includes(p.id) || p.id === t1p1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={t1p2} onChange={e => setT1p2(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Player 2...</option>
                  {side1.filter(p => !selectedIds.includes(p.id) || p.id === t1p2).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-bold text-blue-700 uppercase">{label2}</div>
                <select value={t2p1} onChange={e => setT2p1(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Player 1...</option>
                  {side2.filter(p => !selectedIds.includes(p.id) || p.id === t2p1).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select value={t2p2} onChange={e => setT2p2(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                  <option value="">Player 2...</option>
                  {side2.filter(p => !selectedIds.includes(p.id) || p.id === t2p2).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            );
          })()}
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
            <div className="space-y-3">
              {roundMatches.map(m => {
                const matchPlayers = [
                  { key: 't1p1_ch', player: m.team1_player1, color: 'text-red-700' },
                  { key: 't1p2_ch', player: m.team1_player2, color: 'text-red-700' },
                  { key: 't2p1_ch', player: m.team2_player1, color: 'text-blue-700' },
                  { key: 't2p2_ch', player: m.team2_player2, color: 'text-blue-700' },
                ];
                return (
                <div key={m.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-bold">Match {m.match_number}</div>
                    <div className="flex items-center gap-3">
                      <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded font-mono font-bold text-sm">
                        PIN: {m.pin}
                      </div>
                      <button onClick={() => deleteMatch(m.id)} className="text-red-500 hover:text-red-700 text-xs">
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {matchPlayers.map(({ key, player, color }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${color}`}>{player?.name}</span>
                        <input
                          type="number"
                          defaultValue={(m as unknown as Record<string, number>)[key] || 0}
                          onBlur={async (e) => {
                            await supabase.from('ryder_matches').update({ [key]: parseInt(e.target.value) || 0 }).eq('id', m.id);
                          }}
                          className="w-14 px-1 py-0.5 border rounded text-center text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                );
              })}
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
