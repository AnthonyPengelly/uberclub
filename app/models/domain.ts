export type Game = {
  id: string;
  name: string;
  stage: number;
};

export type GameLog = {
  id: string;
  gameId: string;
  event: string;
};

export type RealTeam = {
  id: string;
  name: string;
};

export type Position = {
  id: string;
  name: string;
};

export type RealPlayer = {
  id: string;
  name: string;
  overall: string;
  potential: string;
  realTeamId: string;
  positionId: string;
};

export type Team = {
  id: string;
  gameId: string;
  userId: string;
  teamName: string;
  managerName: string;
  cash: number;
  isReady: boolean;
  captainBoost: number;
  trainingLevel: number;
  scoutingLevel: number;
  stadiumLevel: number;
};

export type PlayerGameState = {
  playerId: string;
  gameId: string;
  teamId?: string;
  lineupPosition?: number;
  captain: boolean;
  injured: boolean;
  stars: string;
  released: boolean;
};

export type Season = {
  id: string;
  gameId: string;
  seasonNumber: string;
};

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
