'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, Team, Tee, Settings } from '@/lib/types';
import AdminGate from '@/components/AdminGate';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function AdminDashboard() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tees, setTees] = useState<Tee[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);

  // New player form
  const [newName, setNewName] = useState('');
  const [newHandicap, setNewHandicap] = useState('18');
  const [newTeeId, setNewTeeId] = useState('');

  // New team form
  const [teamName, setTeamName] = useState('');
  const [teamP1, setTeamP1] = useState('');
  const [teamP2, setTeamP2] = useState('');

  async function fetchAll() {
    const [pRes, tRes, teeRes, sRes] = await Promise.all([
      supabase.from('players').select('*, tee:tees(*)').order('name'),
      supabase.from('teams').select('*, players(*)').order('name'),
      supabase.from('tees').select('*').order('total_yards', { ascending: false }),
      supabase.from('settings').select('*').single(),
    ]);
    if (pRes.data) setPlayers(pRes.data as unknown as Player[]);
    if (tRes.data) setTeams(tRes.data as unknown as Team[]);
    if (teeRes.data) {
      setTees(teeRes.data as Tee[]);
      if (!newTeeId && teeRes.data.length > 0) {
        const white = teeRes.data.find((t: Tee) => t.name === 'White');
        setNewTeeId(white?.id || teeRes.data[0].id);
      }
    }
    if (sRes.data) setSettings(sRes.data as Settings);
  }

  useEffect(() => { fetchAll(); }, []);

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    await supabase.from('players').insert({
      name: newName.trim(),
      handicap: parseInt(newHandicap) || 18,
      tee_id: newTeeId || null,
    });
    setNewName('');
    setNewHandicap('18');
    fetchAll();
  }

  async function deletePlayer(id: string) {
    await supabase.from('players').delete().eq('id', id);
    fetchAll();
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!teamName.trim() || !teamP1 || !teamP2) return;
    const code = generateCode();
    const { data } = await supabase.from('teams').insert({
      name: teamName.trim(),
      group_code: code,
    }).select().single();
    if (data) {
      await supabase.from('players').update({ team_id: data.id }).in('id', [teamP1, teamP2]);
    }
    setTeamName('');
    setTeamP1('');
    setTeamP2('');
    fetchAll();
  }

  async function deleteTeam(id: string) {
    await supabase.from('players').update({ team_id: null }).eq('team_id', id);
    await supabase.from('teams').delete().eq('id', id);
    fetchAll();
  }

  async function toggleScoring() {
    if (!settings) return;
    await supabase.from('settings').update({ scoring_open: !settings.scoring_open }).eq('id', 1);
    fetchAll();
  }

  const unassignedPlayers = players.filter(p => !p.team_id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button
          onClick={toggleScoring}
          className={`px-4 py-2 rounded-lg font-medium text-white ${
            settings?.scoring_open ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {settings?.scoring_open ? 'Close Scoring' : 'Open Scoring'}
        </button>
      </div>

      {/* Add Player */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Add Player</h2>
        <form onSubmit={addPlayer} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:border-emerald-600 focus:outline-none"
              placeholder="Player name"
            />
          </div>
          <div className="w-20">
            <label className="block text-xs text-gray-500 mb-1">Handicap</label>
            <input
              type="number"
              value={newHandicap}
              onChange={(e) => setNewHandicap(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:border-emerald-600 focus:outline-none"
              min={0}
              max={54}
            />
          </div>
          <div className="w-36">
            <label className="block text-xs text-gray-500 mb-1">Tee</label>
            <select
              value={newTeeId}
              onChange={(e) => setNewTeeId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:border-emerald-600 focus:outline-none"
            >
              {tees.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.total_yards}m)</option>
              ))}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800">
            Add
          </button>
        </form>
      </section>

      {/* Players List */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Players ({players.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2">Name</th>
                <th className="pb-2">Hcp</th>
                <th className="pb-2">Tee</th>
                <th className="pb-2">Team</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {players.map(p => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2">{p.handicap}</td>
                  <td className="py-2">{p.tee?.name || '—'}</td>
                  <td className="py-2 text-gray-500">
                    {teams.find(t => t.id === p.team_id)?.name || '—'}
                  </td>
                  <td className="py-2">
                    <button onClick={() => deletePlayer(p.id)} className="text-red-500 hover:text-red-700 text-xs">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create Team */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Create Team</h2>
        <form onSubmit={createTeam} className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs text-gray-500 mb-1">Team Name</label>
            <input
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:border-emerald-600 focus:outline-none"
              placeholder="e.g. Team 1"
            />
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Player 1</label>
            <select
              value={teamP1}
              onChange={(e) => setTeamP1(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:border-emerald-600 focus:outline-none"
            >
              <option value="">Select...</option>
              {unassignedPlayers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">Player 2</label>
            <select
              value={teamP2}
              onChange={(e) => setTeamP2(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:border-emerald-600 focus:outline-none"
            >
              <option value="">Select...</option>
              {unassignedPlayers.filter(p => p.id !== teamP1).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800">
            Create
          </button>
        </form>
      </section>

      {/* Teams List */}
      <section className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Teams ({teams.length})</h2>
        <div className="space-y-3">
          {teams.map(t => {
            const teamPlayers = (t.players || []) as Player[];
            return (
              <div key={t.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-sm text-gray-500">
                    {teamPlayers.map(p => p.name).join(' & ') || 'No players'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded font-mono font-bold tracking-widest">
                    {t.group_code}
                  </div>
                  <button onClick={() => deleteTeam(t.id)} className="text-red-500 hover:text-red-700 text-xs">
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
          {teams.length === 0 && (
            <p className="text-gray-400 text-sm">No teams yet. Add players first, then create teams.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminDashboard />
    </AdminGate>
  );
}
