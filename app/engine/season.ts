import type { Result } from "~/domain/fixtures.server";
import { updateResult, updateSimResult } from "~/domain/fixtures.server";
import {
  createFixtureLineups,
  getResultsForStage,
} from "~/domain/fixtures.server";
import { getGame } from "~/domain/games.server";
import { createGameLog } from "~/domain/logs.server";
import type { GamePlayer } from "~/domain/players.server";
import {
  setInjured,
  updatePlayerLineupPosition,
} from "~/domain/players.server";
import { getRealTeamPlayers } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import { getRealTeam } from "~/domain/realTeam.server";
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
import { Stage } from "./game";
import { getLineupScores, MAX_DEF_POSITION, MAX_MID_POSITION } from "./lineup";
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
  const game = await getGame(gameId);
  const season = await getCurrentSeason(gameId);
  const allTeams = await getTeamsInGame(gameId);
  await Promise.all(
    allTeams.map(async (x) => {
      const players = await getTeamPlayers(x.id);
      const score = await calculateScoreForTeam(players);
      return createTeamSeason(season.id, x.id, score);
    })
  );
  await createSeasonFixtures(allTeams, season.id, game);
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
        ? playSim(gameId, x as SimFixture, teamsWithPlayers, stage)
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
  await removeInjuredPlayersFromSquads([
    ...homeTeam.players,
    ...awayTeam.players,
  ]);
}

async function playSim(
  gameId: string,
  fixture: SimFixture,
  teams: TeamWithPlayer[],
  stage: Stage
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
  if (
    stage !== Stage.CupQuarterFinal &&
    stage !== Stage.CupSemiFinal &&
    stage !== Stage.CupFinal
  ) {
    if (playerWin) {
      const teamSeason = await getTeamSeason(fixture.seasonId, team.team.id);
      await updateScoreOnTeamSeason(teamSeason.id, teamSeason.score + 6);
    } else if (!winner) {
      const teamSeason = await getTeamSeason(fixture.seasonId, team.team.id);
      await updateScoreOnTeamSeason(teamSeason.id, teamSeason.score + 2);
    }
  }
  await saveFixtureLineup(team, fixture.id);
  await saveFixtureLineup(realTeamWithPlayers, fixture.id, realTeam.id);
  await removeInjuredPlayersFromSquads([
    ...team.players,
    ...realTeamWithPlayers.players,
  ]);
}

async function saveFixtureLineup(
  team: BasicTeamWithPlayer,
  resultId: string,
  realTeamId?: string
) {
  await createFixtureLineups(
    resultId,
    team.players.filter((x) => x.lineupPosition),
    team.team.captainBoost,
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
    homeScore: await getTeamScores(homeTeam, gameId),
    awayScore: await getTeamScores(awayTeam, gameId),
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

async function removeInjuredPlayersFromSquads(players: GamePlayer[]) {
  await Promise.all(
    players
      .filter((x) => x.injured)
      .map((x) => updatePlayerLineupPosition(x.id, undefined, false))
  );
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

async function getTeamScores(
  team: BasicTeamWithPlayer,
  gameId: string
): Promise<SegmentScore> {
  const scores = getLineupScores(team.players, team.team.captainBoost);
  scores.DEF += await rollForScores(6, 2, team.players, gameId);
  scores.MID += await rollForScores(
    6,
    MAX_DEF_POSITION + 1,
    team.players,
    gameId
  );
  scores.FWD += await rollForScores(
    6,
    MAX_MID_POSITION + 1,
    team.players,
    gameId
  );
  return scores;
}

async function rollForScores(
  diceSize: number,
  startingLineupPosition: number,
  players: GamePlayer[],
  gameId: string,
  hasExploded: boolean = false
): Promise<number> {
  const roll = Math.floor(Math.random() * diceSize) + 1;
  if (roll === diceSize) {
    return (
      roll +
      (await rollForScores(
        diceSize,
        startingLineupPosition,
        players,
        gameId,
        true
      ))
    );
  }
  if (hasExploded) {
    const player = players.find(
      (x) => x.lineupPosition === startingLineupPosition + (roll - 1)
    );
    if (player) {
      await setInjured(player.id, true);
      await createGameLog(
        gameId,
        `Ouch! ${player.name} pushed themselves too hard and picked up an injury. They'll be out for the rest of the season!`
      );
      // Set in memory too
      player.injured = true;
    }
  }
  return roll;
}
