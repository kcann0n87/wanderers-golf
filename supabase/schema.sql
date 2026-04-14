-- Wanderers Golf Club - Live Stableford Tracker
-- Run this in your Supabase SQL Editor

-- Tees
create table tees (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slope numeric not null,
  rating numeric not null,
  total_yards int not null,
  hole_yards jsonb not null
);

-- Teams
create table teams (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  group_code text unique not null,
  created_at timestamptz default now()
);

-- Players
create table players (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  handicap int not null default 18,
  tee_id uuid references tees(id),
  team_id uuid references teams(id) on delete set null,
  created_at timestamptz default now()
);

-- Scores
create table scores (
  id uuid default gen_random_uuid() primary key,
  player_id uuid references players(id) on delete cascade not null,
  hole int not null check (hole >= 1 and hole <= 18),
  gross_score int not null check (gross_score >= 1 and gross_score <= 15),
  created_at timestamptz default now(),
  unique(player_id, hole)
);

-- Settings (single row)
create table settings (
  id integer primary key default 1 check (id = 1),
  scoring_open boolean default true,
  event_name text default 'Wanderers Golf Day'
);

insert into settings (id) values (1);

-- Enable realtime
alter publication supabase_realtime add table scores;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table teams;
alter publication supabase_realtime add table settings;

-- RLS (open for simplicity — same as golf-bets)
alter table tees enable row level security;
alter table teams enable row level security;
alter table players enable row level security;
alter table scores enable row level security;
alter table settings enable row level security;

create policy "Allow all on tees" on tees for all using (true) with check (true);
create policy "Allow all on teams" on teams for all using (true) with check (true);
create policy "Allow all on players" on players for all using (true) with check (true);
create policy "Allow all on scores" on scores for all using (true) with check (true);
create policy "Allow all on settings" on settings for all using (true) with check (true);

-- Seed tee data for Wanderers Golf Club
insert into tees (name, slope, rating, total_yards, hole_yards) values
  ('Black', 144, 75.1, 3588, '[355,555,211,361,409,517,221,474,485,438,402,432,555,243,404,394,138,563,406]'),
  ('Black/Blue', 141, 73.7, 3377, '[355,555,173,361,409,475,191,393,465,402,385,555,197,404,394,141,563,406]'),
  ('Blue', 139, 72.4, 3298, '[342,518,173,355,386,475,191,393,465,366,385,517,197,374,350,141,530,380]'),
  ('Blue/White', 133, 71.2, 3186, '[342,490,173,355,363,475,163,393,432,366,348,484,154,374,350,141,530,344]'),
  ('White', 126, 69.7, 3035, '[312,490,140,347,363,433,163,355,432,330,348,484,154,342,322,116,465,344]'),
  ('White/Green', 125, 68.0, 2855, '[312,453,140,347,334,399,163,315,392,330,309,460,154,342,322,116,425,312]'),
  ('Green', 116, 65.6, 2641, '[284,453,105,250,334,399,109,315,392,288,309,460,89,275,287,72,425,312]'),
  ('Orange', 116, 65.6, 2198, '[232,372,105,215,266,355,109,266,278,227,228,379,89,213,215,72,362,243]');
