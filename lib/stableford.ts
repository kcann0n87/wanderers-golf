import { PARS, STROKE_INDEX } from './course';
import { Score, Player, PlayerRound, Team, TeamResult } from './types';

/**
 * How many handicap strokes a player gets on a given hole.
 * E.g. handicap 18 = 1 stroke per hole. Handicap 24 = 1 on all + extra on SI 1-6.
 */
export function getStrokesOnHole(handicap: number, holeIndex: number): number {
  // holeIndex is 0-based (hole 1 = index 0)
  const si = STROKE_INDEX[holeIndex]; // SI is 1-18
  if (handicap <= 0) return 0;
  if (handicap <= 18) {
    return si <= handicap ? 1 : 0;
  }
  // handicap > 18: everyone gets 1, then extra strokes on lowest SI holes
  const extra = handicap - 18;
  return si <= extra ? 2 : 1;
}

/**
 * Calculate Stableford points for a single hole.
 * gross_score is the actual strokes taken.
 */
export function getStablefordPoints(grossScore: number, holeIndex: number, handicap: number): number {
  const par = PARS[holeIndex];
  const strokes = getStrokesOnHole(handicap, holeIndex);
  const netScore = grossScore - strokes;
  const diff = netScore - par;

  if (diff <= -2) return 4; // eagle or better
  if (diff === -1) return 3; // birdie
  if (diff === 0) return 2;  // par
  if (diff === 1) return 1;  // bogey
  return 0; // double bogey or worse
}

/**
 * Build a PlayerRound from raw scores.
 */
export function buildPlayerRound(player: Player, scores: Score[]): PlayerRound {
  const scoresByHole: (Score | null)[] = Array(18).fill(null);
  let totalStableford = 0;
  let thruHole = 0;

  for (const s of scores) {
    const idx = s.hole - 1;
    scoresByHole[idx] = s;
    totalStableford += getStablefordPoints(s.gross_score, idx, player.handicap);
    if (s.hole > thruHole) thruHole = s.hole;
  }

  return { player, scores: scoresByHole, totalStableford, thruHole };
}

/**
 * Build a TeamResult from two PlayerRounds (best ball).
 */
export function buildTeamResult(team: Team, p1: PlayerRound, p2: PlayerRound): TeamResult {
  const bestBallByHole: number[] = [];
  let bestBallTotal = 0;
  let thruHole = 0;

  for (let i = 0; i < 18; i++) {
    const pts1 = p1.scores[i] ? getStablefordPoints(p1.scores[i]!.gross_score, i, p1.player.handicap) : -1;
    const pts2 = p2.scores[i] ? getStablefordPoints(p2.scores[i]!.gross_score, i, p2.player.handicap) : -1;

    if (pts1 >= 0 || pts2 >= 0) {
      const best = Math.max(pts1, pts2);
      bestBallByHole.push(best);
      bestBallTotal += best;
      if (i + 1 > thruHole) thruHole = i + 1;
    } else {
      bestBallByHole.push(0);
    }
  }

  return { team, player1: p1, player2: p2, bestBallTotal, bestBallByHole, thruHole };
}
