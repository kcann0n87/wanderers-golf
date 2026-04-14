-- Clear old team assignments
UPDATE players SET team_id = NULL;
DELETE FROM teams;

-- Create new teams with group codes
INSERT INTO teams (name, group_code) VALUES
  ('Kyle & David B', 'TEAM01'),
  ('Jeff & Sam', 'TEAM02'),
  ('Dan & Dave S', 'TEAM03'),
  ('Omri & Jimmy', 'TEAM04'),
  ('Don & Matt', 'TEAM05'),
  ('Ardie & Steve', 'TEAM06'),
  ('Brett & Nick', 'TEAM07'),
  ('Aaron & Peter', 'TEAM08'),
  ('Nolan & Jordan', 'TEAM09'),
  ('Rich & Paul', 'TEAM10');

-- Assign players to teams
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Kyle & David B') WHERE name IN ('Kyle Cannon', 'David Barry');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Jeff & Sam') WHERE name IN ('Jeffrey Narlinger', 'Sam Meitus');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Dan & Dave S') WHERE name IN ('Dan Navarrete', 'David Sanders');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Omri & Jimmy') WHERE name IN ('Omri', 'Jimmy Brockman');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Don & Matt') WHERE name IN ('Don Ashley', 'Matt Lambrecht');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Ardie & Steve') WHERE name IN ('Ardie Kurshumi', 'Steven Hartman');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Brett & Nick') WHERE name IN ('Brett Winter', 'Nicholas Trimarche');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Aaron & Peter') WHERE name IN ('Aaron Gordon', 'Peter Foote');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Nolan & Jordan') WHERE name IN ('Nolan King', 'Jordan Scott');
UPDATE players SET team_id = (SELECT id FROM teams WHERE name = 'Rich & Paul') WHERE name IN ('Richard Feinstein', 'Paul');
