create table public.games (
  id uuid not null default uuid_generate_v4(),
  createdAt timestamptz not null default current_timestamp,
  name varchar not null,
  stage integer not null default 0,

  primary key (id)
);

create table public.gameLogs (
  id uuid not null default uuid_generate_v4(),
  created_at timestamptz not null default current_timestamp,
  gameId uuid references public.games not null,
  event varchar not null,

  primary key (id)
);

create table public.realTeams (
  id uuid not null default uuid_generate_v4(),
  name varchar not null,

  primary key (id)
);

create table public.positions (
  id uuid not null default uuid_generate_v4(),
  name varchar not null,

  primary key (id)
);

create table public.realPlayers (
  id uuid not null default uuid_generate_v4(),
  name varchar not null,
  overall integer not null,
  potential integer not null,
  realTeamId uuid references public.realTeams not null,
  positionId uuid references public.positions not null,

  primary key (id)
);

create table public.teams (
  id uuid not null default uuid_generate_v4(),
  gameId uuid references public.games not null,
  userId uuid references public.profiles not null,
  teamName varchar not null,
  managerName varchar not null,
  cash integer not null,
  isReady boolean not null default false,
  captainBoost integer not null default 0,
  trainingLevel integer not null default 1,
  scoutingLevel integer not null default 1,
  stadiumLevel integer not null default 1,

  primary key (id),
  unique (gameId, userId)
);

create table public.playerGameStates (
  playerId uuid references public.realPlayers not null,
  gameId uuid references public.games not null,
  teamId uuid references public.teams null,
  lineupPosition integer null,
  captain boolean not null default false,
  injured boolean not null default false,
  released boolean not null default false,
  stars integer not null,

  primary key (playerId, gameId)
);

create table public.seasons (
  id uuid not null default uuid_generate_v4(),
  gameId uuid references public.games not null,
  name varchar not null,
  seasoninteger integer not null,

  primary key (id)
);

create table public.teamSeasons (
  teamId uuid references public.teams not null,
  seasonId uuid references public.seasons not null,
  score integer not null,
  startingScore integer not null,

  primary key (teamId, seasonId)
);

create table public.results (
  id uuid not null default uuid_generate_v4(),
  seasonId uuid references public.seasons not null,
  homeTeamId uuid references public.teams not null,
  awayTeamId uuid references public.teams not null,
  draw boolean not null,
  winningTeamId uuid references public.teams null,

  primary key (id)
);
