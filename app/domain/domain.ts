export type TeamSeason = {
  teamId: string;
  seasonId: number;
  score: number;
  startingScore: number;
};

export type Results = {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  seasonId: string;
  draw: boolean;
  winningTeamId?: string;
};

export type FixtureLineup = {
  id: string;
  result_id: string;
  player_game_state_id: string;
  lineup_position: number;
  captain: boolean;
};
