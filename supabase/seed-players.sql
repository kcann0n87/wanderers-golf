-- Seed all 20 players for Wanderers Golf Day
-- Uses S.O. (Shots Off) as the playing handicap

-- Insert players with tee references
INSERT INTO players (name, handicap, tee_id) VALUES
  ('Nolan King', 17, (SELECT id FROM tees WHERE name = 'Blue')),
  ('Don Ashley', 15, (SELECT id FROM tees WHERE name = 'Green')),
  ('David Barry', 12, (SELECT id FROM tees WHERE name = 'Blue')),
  ('Jimmy Brockman', 15, (SELECT id FROM tees WHERE name = 'Blue')),
  ('Kyle Cannon', 13, (SELECT id FROM tees WHERE name = 'Blue')),
  ('Richard Feinstein', 14, (SELECT id FROM tees WHERE name = 'Green')),
  ('Peter Foote', 8, (SELECT id FROM tees WHERE name = 'Blue')),
  ('Aaron Gordon', 15, (SELECT id FROM tees WHERE name = 'Blue')),
  ('Steven Hartman', 29, (SELECT id FROM tees WHERE name = 'Green')),
  ('Ardie Kurshumi', 11, (SELECT id FROM tees WHERE name = 'Blue')),
  ('Matt Lambrecht', 12, (SELECT id FROM tees WHERE name = 'Blue')),
  ('Sam Meitus', 5, (SELECT id FROM tees WHERE name = 'Black')),
  ('Jeffrey Narlinger', 12, (SELECT id FROM tees WHERE name = 'Blue')),
  ('Dan Navarrete', 16, (SELECT id FROM tees WHERE name = 'Green')),
  ('David Sanders', 0, (SELECT id FROM tees WHERE name = 'Black')),
  ('Jordan Scott', 17, (SELECT id FROM tees WHERE name = 'Blue')),
  ('Brett Winter', 8, (SELECT id FROM tees WHERE name = 'Blue')),
  ('Nicholas Trimarche', 12, (SELECT id FROM tees WHERE name = 'Blue')),
  ('Omri', 12, (SELECT id FROM tees WHERE name = 'Blue')),
  ('Paul', 15, (SELECT id FROM tees WHERE name = 'Blue'));
