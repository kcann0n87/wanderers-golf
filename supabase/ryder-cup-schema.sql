-- Ryder Cup Tournament Schema
-- Run this AFTER the base schema

-- Add ryder team and course handicaps to players
ALTER TABLE players ADD COLUMN IF NOT EXISTS ryder_team text; -- 'jordan' or 'nolan'
ALTER TABLE players ADD COLUMN IF NOT EXISTS course_handicap_straits int default 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS course_handicap_river int default 0;

-- Add active_round to settings
ALTER TABLE settings ADD COLUMN IF NOT EXISTS active_round int default 1;

-- Matches table
CREATE TABLE IF NOT EXISTS ryder_matches (
  id uuid default gen_random_uuid() primary key,
  round int not null check (round in (1, 2)),
  match_number int not null,
  team1_player1_id uuid references players(id),
  team1_player2_id uuid references players(id),
  team2_player1_id uuid references players(id),
  team2_player2_id uuid references players(id),
  pin text not null,
  created_at timestamptz default now(),
  unique(round, match_number)
);

-- Update scores to reference a match
ALTER TABLE scores ADD COLUMN IF NOT EXISTS match_id uuid references ryder_matches(id);
-- Drop the old unique constraint and add new one
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_player_id_hole_key;
ALTER TABLE scores ADD CONSTRAINT scores_player_match_hole_key UNIQUE (player_id, match_id, hole);

-- Enable realtime on new table
ALTER publication supabase_realtime ADD TABLE ryder_matches;

-- RLS
ALTER TABLE ryder_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on ryder_matches" ON ryder_matches FOR ALL USING (true) WITH CHECK (true);

-- Seed the 20 Ryder Cup players
-- Team Jordan
INSERT INTO players (name, ryder_team, handicap, course_handicap_straits, course_handicap_river)
VALUES
  ('Jordan', 'jordan', 0, 0, 0),
  ('Clancy', 'jordan', 0, 0, 0),
  ('Eric', 'jordan', 0, 0, 0),
  ('Jeff', 'jordan', 0, 0, 0),
  ('Ardit', 'jordan', 0, 0, 0),
  ('David', 'jordan', 0, 0, 0),
  ('Paul', 'jordan', 0, 0, 0),
  ('Timmy', 'jordan', 0, 0, 0),
  ('Jimmy', 'jordan', 0, 0, 0),
  ('Rishi', 'jordan', 0, 0, 0)
ON CONFLICT DO NOTHING;

-- Team Nolan
INSERT INTO players (name, ryder_team, handicap, course_handicap_straits, course_handicap_river)
VALUES
  ('Nolan', 'nolan', 0, 0, 0),
  ('Matt', 'nolan', 0, 0, 0),
  ('Chet', 'nolan', 0, 0, 0),
  ('Kevin', 'nolan', 0, 0, 0),
  ('Bobby', 'nolan', 0, 0, 0),
  ('Kyle', 'nolan', 0, 0, 0),
  ('Aaron', 'nolan', 0, 0, 0),
  ('Richard', 'nolan', 0, 0, 0),
  ('Chuck', 'nolan', 0, 0, 0),
  ('Trevor', 'nolan', 0, 0, 0)
ON CONFLICT DO NOTHING;
