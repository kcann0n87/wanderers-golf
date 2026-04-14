export interface Tee {
  id: string;
  name: string;
  slope: number;
  rating: number;
  total_yards: number;
  hole_yards: number[];
}

export interface Player {
  id: string;
  name: string;
  handicap: number;
  tee_id: string;
  team_id: string | null;
  created_at: string;
  tee?: Tee;
}

export interface Team {
  id: string;
  name: string;
  group_code: string;
  created_at: string;
  players?: Player[];
}

export interface Score {
  id: string;
  player_id: string;
  hole: number;
  gross_score: number;
  created_at: string;
}

export interface Settings {
  id: number;
  scoring_open: boolean;
  event_name: string;
}

// Computed types for leaderboard
export interface PlayerRound {
  player: Player;
  scores: (Score | null)[]; // index 0 = hole 1, etc.
  totalStableford: number;
  thruHole: number;
}

export interface TeamResult {
  team: Team;
  player1: PlayerRound;
  player2: PlayerRound;
  bestBallTotal: number;
  bestBallByHole: number[]; // 18 entries
  thruHole: number;
}
