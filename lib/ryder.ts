import { CourseData } from './courses';
import { Player, Score, RyderMatch } from './types';

/**
 * Get adjusted handicaps for a match — zeroed off the lowest CH in the foursome.
 * Uses per-match handicaps stored on the match itself.
 */
export function getAdjustedHandicaps(
  match: RyderMatch,
  players: Player[],
  round: number,
): Record<string, number> {
  // Use per-match handicaps
  const rawMap: Record<string, number> = {
    [match.team1_player1_id]: match.t1p1_ch || 0,
    [match.team1_player2_id]: match.t1p2_ch || 0,
    [match.team2_player1_id]: match.t2p1_ch || 0,
    [match.team2_player2_id]: match.t2p2_ch || 0,
  };

  const rawValues = Object.values(rawMap);
  const lowest = Math.min(...rawValues);

  const adjusted: Record<string, number> = {};
  for (const [id, ch] of Object.entries(rawMap)) {
    adjusted[id] = ch - lowest;
  }
  return adjusted;
}

/**
 * How many handicap strokes a player gets on a given hole.
 */
export function getStrokesOnHole(courseHandicap: number, holeStrokeIndex: number): number {
  if (courseHandicap <= 0) return 0;
  if (courseHandicap <= 18) {
    return holeStrokeIndex <= courseHandicap ? 1 : 0;
  }
  const extra = courseHandicap - 18;
  return holeStrokeIndex <= extra ? 2 : 1;
}

/**
 * Get net score for a player on a hole.
 */
export function getNetScore(gross: number, courseHandicap: number, holeStrokeIndex: number): number {
  return gross - getStrokesOnHole(courseHandicap, holeStrokeIndex);
}

/**
 * R1: Best Ball match status.
 * Returns the match status from Team1's perspective.
 * Positive = Team1 up, Negative = Team2 up, 0 = All Square.
 */
export function calcBestBallMatch(
  match: RyderMatch,
  scores: Score[],
  course: CourseData,
  players: Player[],
): { status: number; thru: number; holesRemaining: number; clinched: boolean; clinchHole: number; team1Label: string; team2Label: string } {
  const p1 = players.find(p => p.id === match.team1_player1_id);
  const p2 = players.find(p => p.id === match.team1_player2_id);
  const p3 = players.find(p => p.id === match.team2_player1_id);
  const p4 = players.find(p => p.id === match.team2_player2_id);

  if (!p1 || !p2 || !p3 || !p4) return { status: 0, thru: 0, holesRemaining: 18, clinched: false, clinchHole: 0, team1Label: '', team2Label: '' };

  const adjusted = getAdjustedHandicaps(match, players, 1);

  let status = 0;
  let thru = 0;
  let clinched = false;
  let clinchHole = 0;

  for (let hole = 1; hole <= 18; hole++) {
    // If match is already clinched, stop processing further holes
    if (clinched) break;

    const si = course.strokeIndex[hole - 1];
    const s1 = scores.find(s => s.player_id === match.team1_player1_id && s.hole === hole);
    const s2 = scores.find(s => s.player_id === match.team1_player2_id && s.hole === hole);
    const s3 = scores.find(s => s.player_id === match.team2_player1_id && s.hole === hole);
    const s4 = scores.find(s => s.player_id === match.team2_player2_id && s.hole === hole);

    // Need at least one score from each team
    if ((!s1 && !s2) || (!s3 && !s4)) continue;

    const net1a = s1 ? getNetScore(s1.gross_score, adjusted[match.team1_player1_id], si) : 99;
    const net1b = s2 ? getNetScore(s2.gross_score, adjusted[match.team1_player2_id], si) : 99;
    const net2a = s3 ? getNetScore(s3.gross_score, adjusted[match.team2_player1_id], si) : 99;
    const net2b = s4 ? getNetScore(s4.gross_score, adjusted[match.team2_player2_id], si) : 99;

    const team1Best = Math.min(net1a, net1b);
    const team2Best = Math.min(net2a, net2b);

    if (team1Best < team2Best) status++;
    else if (team2Best < team1Best) status--;

    thru = hole;

    // Check if match is clinched: lead > holes remaining
    const remaining = 18 - hole;
    if (Math.abs(status) > remaining) {
      clinched = true;
      clinchHole = hole;
    }
  }

  const t1Name = `${p1.name.split(' ')[0]}/${p2.name.split(' ')[0]}`;
  const t2Name = `${p3.name.split(' ')[0]}/${p4.name.split(' ')[0]}`;

  return {
    status,
    thru,
    holesRemaining: clinched ? 0 : 18 - thru,
    clinched,
    clinchHole,
    team1Label: t1Name,
    team2Label: t2Name,
  };
}

/**
 * R1: Convert best ball match result to points.
 * 10 for win, 5 for tie, 0 for loss.
 * Match is complete if all 18 holes played OR if clinched early.
 */
export function bestBallPoints(status: number, isComplete: boolean): { team1: number; team2: number } | null {
  if (!isComplete) return null;
  if (status > 0) return { team1: 10, team2: 0 };
  if (status < 0) return { team1: 0, team2: 10 };
  return { team1: 5, team2: 5 };
}

/**
 * R2: High/Low scoring.
 * Each hole is worth 2 points (1 for low ball, 1 for high ball).
 * Returns cumulative points for each side.
 */
export function calcHighLowMatch(
  match: RyderMatch,
  scores: Score[],
  course: CourseData,
  players: Player[],
): { team1Points: number; team2Points: number; thru: number; holeResults: { low1: number; low2: number; high1: number; high2: number }[] } {
  const p1 = players.find(p => p.id === match.team1_player1_id);
  const p2 = players.find(p => p.id === match.team1_player2_id);
  const p3 = players.find(p => p.id === match.team2_player1_id);
  const p4 = players.find(p => p.id === match.team2_player2_id);

  if (!p1 || !p2 || !p3 || !p4) return { team1Points: 0, team2Points: 0, thru: 0, holeResults: [] };

  const adjusted = getAdjustedHandicaps(match, players, 2);

  let team1Points = 0;
  let team2Points = 0;
  let thru = 0;
  const holeResults: { low1: number; low2: number; high1: number; high2: number }[] = [];

  for (let hole = 1; hole <= 18; hole++) {
    const si = course.strokeIndex[hole - 1];
    const s1 = scores.find(s => s.player_id === match.team1_player1_id && s.hole === hole);
    const s2 = scores.find(s => s.player_id === match.team1_player2_id && s.hole === hole);
    const s3 = scores.find(s => s.player_id === match.team2_player1_id && s.hole === hole);
    const s4 = scores.find(s => s.player_id === match.team2_player2_id && s.hole === hole);

    if (!s1 || !s2 || !s3 || !s4) continue;

    const net1a = getNetScore(s1.gross_score, adjusted[match.team1_player1_id], si);
    const net1b = getNetScore(s2.gross_score, adjusted[match.team1_player2_id], si);
    const net2a = getNetScore(s3.gross_score, adjusted[match.team2_player1_id], si);
    const net2b = getNetScore(s4.gross_score, adjusted[match.team2_player2_id], si);

    // Low ball: best of each team
    const low1 = Math.min(net1a, net1b);
    const low2 = Math.min(net2a, net2b);
    // High ball: worst of each team
    const high1 = Math.max(net1a, net1b);
    const high2 = Math.max(net2a, net2b);

    holeResults.push({ low1, low2, high1, high2 });

    // Low ball point
    if (low1 < low2) team1Points++;
    else if (low2 < low1) team2Points++;
    else { team1Points += 0.5; team2Points += 0.5; }

    // High ball point
    if (high1 < high2) team1Points++;
    else if (high2 < high1) team2Points++;
    else { team1Points += 0.5; team2Points += 0.5; }

    thru = hole;
  }

  return { team1Points, team2Points, thru, holeResults };
}

/**
 * Format match status for display.
 * clinched: match was won before hole 18 (e.g., "4&3" means 4 up with 3 to play)
 */
export function formatMatchStatus(status: number, thru: number, clinched?: boolean): string {
  if (thru === 0) return 'Not started';

  // Match clinched early — show "X&Y" format (e.g., "4&3")
  if (clinched && status !== 0) {
    const holesLeft = 18 - thru;
    return `${Math.abs(status)}&${holesLeft}`;
  }

  if (thru === 18) {
    if (status === 0) return 'TIED';
    return `${Math.abs(status)} UP`;
  }
  if (status === 0) return `ALL SQUARE thru ${thru}`;
  return `${Math.abs(status)} UP thru ${thru}`;
}
