import type { Result } from "~/domain/fixtures.server";
import { updateResult, updateSimResult } from "~/domain/fixtures.server";
import {
  createFixtureLineups,
  getResultsForStage,
} from "~/domain/fixtures.server";
import { createGameLog } from "~/domain/logs.server";
import type { GamePlayer } from "~/domain/players.server";
import { getRealTeamPlayers } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import { getRealTeam } from "~/domain/realTeam.server";
import type { TeamSeasonSummary } from "~/domain/season.server";
import {
  createTeamSeason,
  getCurrentSeason,
  getTeamSeason,
  updateScoreOnTeamSeason,
} from "~/domain/season.server";
import type { Team } from "~/domain/team.server";
import { getTeamsInGame } from "~/domain/team.server";
import { getPlayersWithAiPositions } from "./ai-team";
import { createSeasonFixtures } from "./fixtures";
import type { Stage } from "./game";
import { getLineupScores } from "./lineup";
import { calculateScoreForTeam } from "./team";

type TeamWithPlayer = {
  team: Team;
  players: GamePlayer[];
};

type BasicTeamWithPlayer = {
  team: { teamName: string; captainBoost: number };
  players: GamePlayer[];
};

type Fixture = Result & { awayTeamId: string };
type SimFixture = Result & { realTeamId: string };

export async function startSeason(gameId: string) {
  const season = await getCurrentSeason(gameId);
  const allTeams = await getTeamsInGame(gameId);
  await Promise.all(
    allTeams.map(async (x) => {
      const players = await getTeamPlayers(x.id);
      const score = await calculateScoreForTeam(players);
      return createTeamSeason(season.id, x.id, score);
    })
  );
  await createSeasonFixtures(allTeams, season.id);
}

export async function playFixtures(gameId: string, stage: Stage) {
  const season = await getCurrentSeason(gameId);
  const allTeams = (await getTeamsInGame(gameId)).sort((a, b) =>
    (a.id as string).localeCompare(b.id as string)
  );
  const teamsWithPlayers = await Promise.all(
    allTeams.map(async (x) => ({
      team: x,
      players: await getTeamPlayers(x.id),
    }))
  );
  const fixtures = await getResultsForStage(season.id, stage);
  await Promise.all(
    fixtures.map((x) =>
      x.realTeamId
        ? playSim(gameId, x as SimFixture, teamsWithPlayers)
        : playFixture(gameId, x as Fixture, teamsWithPlayers)
    )
  );
}

async function playFixture(
  gameId: string,
  fixture: Fixture,
  teams: TeamWithPlayer[]
) {
  const homeTeam = teams.find(
    (x) => x.team.id === fixture.homeTeamId
  ) as TeamWithPlayer;
  const awayTeam = teams.find(
    (x) => x.team.id === fixture.awayTeamId
  ) as TeamWithPlayer;
  const { winner, homeScore, awayScore } = await calulateWinner(
    gameId,
    homeTeam,
    awayTeam
  );
  await updateResult(
    fixture.id,
    !winner,
    winner?.team.id || null,
    homeScore.DEF,
    homeScore.MID,
    homeScore.FWD,
    awayScore.DEF,
    awayScore.MID,
    awayScore.FWD
  );
  if (winner) {
    const teamSeason = await getTeamSeason(fixture.seasonId, winner.team.id);
    await updateScoreOnTeamSeason(teamSeason.id, teamSeason.score + 6);
  } else {
    const homeTeamSeason = await getTeamSeason(
      fixture.seasonId,
      homeTeam.team.id
    );
    await updateScoreOnTeamSeason(homeTeamSeason.id, homeTeamSeason.score + 2);
    const awayTeamSeason = await getTeamSeason(
      fixture.seasonId,
      awayTeam.team.id
    );
    await updateScoreOnTeamSeason(awayTeamSeason.id, awayTeamSeason.score + 2);
  }
  await saveFixtureLineup(homeTeam, fixture.id);
  await saveFixtureLineup(awayTeam, fixture.id);
}

async function playSim(
  gameId: string,
  fixture: SimFixture,
  teams: TeamWithPlayer[]
) {
  const team = teams.find(
    (x) => x.team.id === fixture.homeTeamId
  ) as TeamWithPlayer;
  const realTeam = await getRealTeam(fixture.realTeamId);
  const realTeamPlayers = await getRealTeamPlayers(fixture.realTeamId, gameId);
  const realTeamWithPlayers = {
    team: {
      teamName: realTeam.name,
      captainBoost: 1,
    },
    players: getPlayersWithAiPositions(realTeamPlayers),
  };
  const { winner, homeScore, awayScore } = await calulateWinner(
    gameId,
    team,
    realTeamWithPlayers
  );
  const playerWin =
    winner && (winner as TeamWithPlayer).team.id === team.team.id;
  await updateSimResult(
    fixture.id,
    !playerWin && !!winner,
    !winner,
    playerWin ? team.team.id : null,
    homeScore.DEF,
    homeScore.MID,
    homeScore.FWD,
    awayScore.DEF,
    awayScore.MID,
    awayScore.FWD
  );
  if (playerWin) {
    const teamSeason = await getTeamSeason(fixture.seasonId, team.team.id);
    await updateScoreOnTeamSeason(teamSeason.id, teamSeason.score + 6);
  } else if (!winner) {
    const teamSeason = await getTeamSeason(fixture.seasonId, team.team.id);
    await updateScoreOnTeamSeason(teamSeason.id, teamSeason.score + 2);
  }
  await saveFixtureLineup(team, fixture.id);
  await saveFixtureLineup(realTeamWithPlayers, fixture.id, realTeam.id);
}

async function saveFixtureLineup(
  team: BasicTeamWithPlayer,
  resultId: string,
  realTeamId?: string
) {
  await createFixtureLineups(
    resultId,
    team.players.filter((x) => x.lineupPosition),
    realTeamId
  );
}

type SegmentScore = {
  DEF: number;
  MID: number;
  FWD: number;
};

type FixtureScore<T> = {
  winner: T | null;
  homeScore: SegmentScore;
  awayScore: SegmentScore;
};

async function calulateWinner<T extends BasicTeamWithPlayer>(
  gameId: string,
  homeTeam: T,
  awayTeam: T
): Promise<FixtureScore<T>> {
  const fixtureScore = {
    homeScore: getTeamScores(homeTeam),
    awayScore: getTeamScores(awayTeam),
  };
  const defenceResult = calculateSegmentResult(
    fixtureScore.homeScore.DEF,
    fixtureScore.awayScore.FWD
  );
  const midfieldResult = calculateSegmentResult(
    fixtureScore.homeScore.MID,
    fixtureScore.awayScore.MID
  );
  const forwardResult = calculateSegmentResult(
    fixtureScore.homeScore.FWD,
    fixtureScore.awayScore.DEF
  );
  const result = defenceResult + midfieldResult + forwardResult;
  if (result > 0) {
    await createGameLog(
      gameId,
      `${homeTeam.team.teamName} beat ${
        awayTeam.team.teamName
      } with ${scoreSummary(fixtureScore.homeScore)} vs. ${scoreSummary(
        fixtureScore.awayScore
      )} and receives 6 points.`
    );
    return { winner: homeTeam, ...fixtureScore };
  }
  if (result < 0) {
    await createGameLog(
      gameId,
      `${awayTeam.team.teamName} beat ${
        homeTeam.team.teamName
      } with ${scoreSummary(fixtureScore.awayScore)} vs. ${scoreSummary(
        fixtureScore.homeScore
      )} and receives 6 points.`
    );
    return { winner: awayTeam, ...fixtureScore };
  }
  await createGameLog(
    gameId,
    `${awayTeam.team.teamName} and ${
      homeTeam.team.teamName
    } draw! With ${scoreSummary(fixtureScore.awayScore)} vs. ${scoreSummary(
      fixtureScore.homeScore
    )}, both receive 2 points`
  );
  return { winner: null, ...fixtureScore };
}

function scoreSummary(scores: { DEF: number; MID: number; FWD: number }) {
  return `DEF: ${scores.DEF}, MID: ${scores.MID}, FWD: ${scores.FWD}`;
}

function calculateSegmentResult(homeScore: number, awayScore: number) {
  const difference = homeScore - awayScore;
  if (difference > 0) return 1;
  if (difference < 0) return -1;
  return 0;
}

function getTeamScores(team: BasicTeamWithPlayer): SegmentScore {
  const scores = getLineupScores(team.players, team.team.captainBoost);
  scores.DEF += Math.floor(Math.random() * 12) + 1;
  scores.MID += Math.floor(Math.random() * 12) + 1;
  scores.FWD += Math.floor(Math.random() * 12) + 1;
  return scores;
}

export function orderTeamsInSeason(teamSeasons: TeamSeasonSummary[]) {
  return teamSeasons
    .sort((a, b) => b.id.localeCompare(a.id))
    .sort((a, b) => b.startingScore - a.startingScore)
    .sort((a, b) => b.score - a.score);
}
