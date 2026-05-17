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
  ryder_team: string | null; // 'jordan' or 'nolan'
  course_handicap_straits: number | null;
  course_handicap_river: number | null;
  created_at: string;
  tee?: Tee;
}

export interface Team {
  id: string;
  name: string;
  group_code: string;
  foursome: number | null;
  pin: string | null;
  created_at: string;
  players?: Player[];
}

export interface RyderMatch {
  id: string;
  round: number; // 1 = Straits best ball, 2 = River high/low
  match_number: number;
  team1_player1_id: string;
  team1_player2_id: string;
  team2_player1_id: string;
  team2_player2_id: string;
  pin: string;
  created_at: string;
  // joined
  team1_player1?: Player;
  team1_player2?: Player;
  team2_player1?: Player;
  team2_player2?: Player;
}

export interface Score {
  id: string;
  player_id: string;
  match_id: string;
  hole: number;
  gross_score: number;
  created_at: string;
}

export interface Settings {
  id: number;
  scoring_open: boolean;
  event_name: string;
  active_round: number; // 1 or 2
}

// Computed types
export interface PlayerRound {
  player: Player;
  scores: (Score | null)[];
  totalStableford: number;
  thruHole: number;
}

export interface TeamResult {
  team: Team;
  player1: PlayerRound;
  player2: PlayerRound;
  bestBallTotal: number;
  bestBallByHole: number[];
  thruHole: number;
}
