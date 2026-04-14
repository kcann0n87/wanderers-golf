-- Seed all 20 players
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

-- Create 10 teams with group codes
INSERT INTO teams (name, group_code) VALUES
  ('Nolan & Sam', 'GRP01'),
  ('Ardie & Jimmy', 'GRP02'),
  ('Kyle & Aaron', 'GRP03'),
  ('Dave & Paul', 'GRP04'),
  ('Peter & Don', 'GRP05'),
  ('Jeff & Jordan', 'GRP06'),
  ('Danny & Steve', 'GRP07'),
  ('Omri & Nick', 'GRP08'),
  ('David B & Rich', 'GRP09'),
  ('Matt & Brett', 'GRP10');

-- Assign players to teams
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Nolan & Sam') WHERE name IN ('Nolan King', 'Sam Meitus');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Ardie & Jimmy') WHERE name IN ('Ardie Kurshumi', 'Jimmy Brockman');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Kyle & Aaron') WHERE name IN ('Kyle Cannon', 'Aaron Gordon');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Dave & Paul') WHERE name IN ('David Sanders', 'Paul');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Peter & Don') WHERE name IN ('Peter Foote', 'Don Ashley');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Jeff & Jordan') WHERE name IN ('Jeffrey Narlinger', 'Jordan Scott');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Danny & Steve') WHERE name IN ('Dan Navarrete', 'Steven Hartman');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Omri & Nick') WHERE name IN ('Omri', 'Nicholas Trimarche');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'David B & Rich') WHERE name IN ('David Barry', 'Richard Feinstein');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Matt & Brett') WHERE name IN ('Matt Lambrecht', 'Brett Winter');
