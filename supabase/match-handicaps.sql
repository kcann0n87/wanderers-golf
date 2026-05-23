-- Add per-match handicap columns
ALTER TABLE ryder_matches ADD COLUMN IF NOT EXISTS t1p1_ch int default 0;
ALTER TABLE ryder_matches ADD COLUMN IF NOT EXISTS t1p2_ch int default 0;
ALTER TABLE ryder_matches ADD COLUMN IF NOT EXISTS t2p1_ch int default 0;
ALTER TABLE ryder_matches ADD COLUMN IF NOT EXISTS t2p2_ch int default 0;
