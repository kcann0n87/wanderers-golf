-- Allow round 3 in matches
ALTER TABLE ryder_matches DROP CONSTRAINT IF EXISTS ryder_matches_round_check;
ALTER TABLE ryder_matches ADD CONSTRAINT ryder_matches_round_check CHECK (round IN (1, 2, 3));

-- Drop unique constraint on round+match_number so R3 can have its own matches
ALTER TABLE ryder_matches DROP CONSTRAINT IF EXISTS ryder_matches_round_match_number_key;

-- Add John B
INSERT INTO players (name, ryder_team, handicap, course_handicap_straits, course_handicap_river)
VALUES ('John B', 'jordan', 0, 0, 0)
ON CONFLICT DO NOTHING;
