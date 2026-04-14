-- Fix course data: correct pars, stroke index, and tees from physical scorecard

-- First reassign players from old tees to new ones before deleting
-- Players on Black stay on Black
-- Players on Blue stay on Blue
-- Players on Green stay on Green
-- No players on other tees

-- Delete old tees that don't exist on the real card
DELETE FROM tees WHERE name NOT IN ('Black', 'Blue', 'Green');

-- Update existing tees with correct yardages
UPDATE tees SET total_yards = 7052, hole_yards = '[416,579,225,453,169,449,552,330,363,392,222,566,362,406,219,421,501,427]' WHERE name = 'Black';
UPDATE tees SET total_yards = 6585, hole_yards = '[402,548,201,421,148,404,513,307,340,361,203,545,337,383,192,398,482,400]' WHERE name = 'Blue';
UPDATE tees SET total_yards = 6129, hole_yards = '[387,526,167,395,138,382,482,294,305,349,188,485,300,369,168,385,445,364]' WHERE name = 'Green';

-- Add Gold and Silver tees
INSERT INTO tees (name, slope, rating, total_yards, hole_yards) VALUES
  ('Gold', 125, 68.0, 5517, '[310,452,151,365,120,367,409,268,274,332,168,462,264,341,146,350,388,350]'),
  ('Silver', 116, 65.6, 4739, '[279,408,135,317,82,318,380,227,245,284,129,383,230,273,100,283,353,313]');
