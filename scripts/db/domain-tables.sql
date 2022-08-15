create table public.games (
  id uuid not null default uuid_generate_v4(),
  created_at timestamptz not null default current_timestamp,
  player_collection_id uuid references public.player_collections not null,
  name varchar not null,
  stage integer not null default 0,
  -- Explicitly doesn't join to teams, as it confuses the join in the other direction
  winning_team varchar null,
  victory_points integer not null default 100,

  primary key (id)
);

create table public.game_logs (
  id uuid not null default uuid_generate_v4(),
  created_at timestamptz not null default current_timestamp,
  game_id uuid references public.games not null,
  event varchar not null,

  primary key (id)
);

create table public.player_collections (
  id uuid not null default uuid_generate_v4(),
  name varchar not null,

  primary key (id)
)

create table public.real_teams (
  id uuid not null default uuid_generate_v4(),
  name varchar not null,
  player_collection_id uuid references public.player_collections not null,

  primary key (id)
);

create table public.positions (
  id uuid not null default uuid_generate_v4(),
  name varchar not null,

  primary key (id)
);
    
INSERT INTO public.positions (name)
values 
    ('GKP'),
    ('DEF'),
    ('MID'),
    ('FWD');

create table public.real_players (
  id uuid not null default uuid_generate_v4(),
  name varchar not null,
  overall integer not null,
  potential integer not null,
  real_team_id uuid references public.real_teams not null,
  position_id uuid references public.positions not null,
  image_url varchar not null,

  primary key (id)
);

create table public.teams (
  id uuid not null default uuid_generate_v4(),
  game_id uuid references public.games not null,
  user_id uuid references public.profiles not null,
  team_name varchar not null,
  manager_name varchar not null,
  cash integer not null,
  is_ready boolean not null default false,
  captain_boost integer not null default 0,
  training_level integer not null default 1,
  scouting_level integer not null default 1,
  stadium_level integer not null default 1,

  primary key (id),
  unique (game_id, user_id)
);

create table public.player_game_states (
  id uuid not null default uuid_generate_v4(),
  player_id uuid references public.real_players not null,
  game_id uuid references public.games not null,
  team_id uuid references public.teams null,
  lineup_position integer null,
  captain boolean not null default false,
  injured boolean not null default false,
  out_of_deck boolean not null default false,
  stars integer not null,

  primary key (id),
  unique (player_id, game_id)
);

create table public.seasons (
  id uuid not null default uuid_generate_v4(),
  game_id uuid references public.games not null,
  name varchar not null,
  season integer not null,

  primary key (id)
);

create table public.training_logs (
  id uuid not null default uuid_generate_v4(),
  season_id uuid references public.seasons not null,
  team_id uuid references public.teams not null,
  result integer not null,

  primary key (id)
);

create table public.scouting_logs (
  id uuid not null default uuid_generate_v4(),
  season_id uuid references public.seasons not null,
  team_id uuid references public.teams not null,
  player_game_state_id uuid references public.player_game_states not null,

  primary key (id)
);

create table public.improvement_logs (
  id uuid not null default uuid_generate_v4(),
  season_id uuid references public.seasons not null,
  team_id uuid references public.teams not null,

  primary key (id)
);

create table public.deadline_day_players (
  id uuid not null default uuid_generate_v4(),
  season_id uuid references public.seasons not null,
  player_game_state_id uuid references public.player_game_states not null,

  primary key (id)
);

create table public.deadline_day_bids (
  id uuid not null default uuid_generate_v4(),
  team_id uuid references public.teams not null,
  deadline_day_player_id uuid references public.deadline_day_players not null,
  cost integer not null,

  primary key (id)
);

create table public.team_seasons (
  id uuid not null default uuid_generate_v4(),
  team_id uuid references public.teams not null,
  season_id uuid references public.seasons not null,
  score integer not null,
  starting_score integer not null,

  primary key (id),
  unique (team_id, season_id)
);

create table public.results (
  id uuid not null default uuid_generate_v4(),
  season_id uuid references public.seasons not null,
  home_team_id uuid references public.teams not null,
  away_team_id uuid references public.teams null,
  real_team_id uuid references public.real_teams null,
  draw boolean null,
  winning_team_id uuid references public.teams null,
  sim_win boolean null,
  home_def integer null,
  home_mid integer null,
  home_fwd integer null,
  away_def integer null,
  away_mid integer null,
  away_fwd integer null,
  stage integer not null,

  primary key (id)
);

create table public.fixture_lineups (
  id uuid not null default uuid_generate_v4(),
  result_id uuid references public.results not null,
  player_game_state_id uuid references public.player_game_states not null,
  lineup_position integer not null,
  captain_boost integer null,
  real_team_id uuid references public.real_teams null,
  injured boolean not null,

  primary key (id)
)
