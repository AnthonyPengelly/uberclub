import { createFixtureLineups, createResult } from "~/domain/fixtures.server";
import { createGameLog } from "~/domain/logs.server";
import type { GamePlayer } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import type { TeamSeason } from "~/domain/season.server";
import {
  createTeamSeason,
  getCurrentSeason,
  getTeamSeason,
  updateScoreOnTeamSeason,
} from "~/domain/season.server";
import type { Team } from "~/domain/team.server";
import { getTeamsInGame } from "~/domain/team.server";
import { Stage } from "./game";
import { getLineupScores } from "./lineup";

type TeamWithPlayer = {
  team: Team;
  players: GamePlayer[];
};

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
}

// TODO for less/more than 4 players
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
  switch (stage) {
    case Stage.Match1:
      await playFixture(
        gameId,
        season.id,
        teamsWithPlayers[0],
        teamsWithPlayers[2]
      );
      await playFixture(
        gameId,
        season.id,
        teamsWithPlayers[1],
        teamsWithPlayers[3]
      );
      return;
    case Stage.Match2:
      await Promise.all(allTeams.map((x) => playSim(gameId, season.id, x)));
      await playFixture(
        gameId,
        season.id,
        teamsWithPlayers[0],
        teamsWithPlayers[1]
      );
      await playFixture(
        gameId,
        season.id,
        teamsWithPlayers[2],
        teamsWithPlayers[3]
      );
      return;
    case Stage.Match3:
      await Promise.all(allTeams.map((x) => playSim(gameId, season.id, x)));
      await playFixture(
        gameId,
        season.id,
        teamsWithPlayers[0],
        teamsWithPlayers[3]
      );
      await playFixture(
        gameId,
        season.id,
        teamsWithPlayers[1],
        teamsWithPlayers[2]
      );
      return;
    default:
      throw new Error("Invalid stage " + stage);
  }
}

async function playFixture(
  gameId: string,
  seasonId: string,
  homeTeam: TeamWithPlayer,
  awayTeam: TeamWithPlayer
) {
  const winner = await calulateWinner(gameId, homeTeam, awayTeam);
  const resultId = await createResult(
    seasonId,
    homeTeam.team.id,
    awayTeam.team.id,
    !winner,
    winner?.team.id || null
  );
  if (winner) {
    const teamSeason = await getTeamSeason(seasonId, winner.team.id);
    await updateScoreOnTeamSeason(teamSeason.id, teamSeason.score + 6);
  } else {
    const homeTeamSeason = await getTeamSeason(seasonId, homeTeam.team.id);
    await updateScoreOnTeamSeason(homeTeamSeason.id, homeTeamSeason.score + 2);
    const awayTeamSeason = await getTeamSeason(seasonId, awayTeam.team.id);
    await updateScoreOnTeamSeason(awayTeamSeason.id, awayTeamSeason.score + 2);
  }
  await saveFixtureLineup(homeTeam, resultId);
  await saveFixtureLineup(awayTeam, resultId);
}

async function saveFixtureLineup(team: TeamWithPlayer, resultId: string) {
  await createFixtureLineups(
    resultId,
    team.players.filter((x) => x.lineupPosition)
  );
}

async function calulateWinner(
  gameId: string,
  homeTeam: TeamWithPlayer,
  awayTeam: TeamWithPlayer
) {
  const homeScores = getTeamScores(homeTeam);
  const awayScores = getTeamScores(awayTeam);
  const defenceResult = calculateSegmentResult(homeScores.DEF, awayScores.FWD);
  const midfieldResult = calculateSegmentResult(homeScores.MID, awayScores.MID);
  const forwardResult = calculateSegmentResult(homeScores.FWD, awayScores.DEF);
  const result = defenceResult + midfieldResult + forwardResult;
  if (result > 0) {
    await createGameLog(
      gameId,
      `${homeTeam.team.teamName} beat ${
        awayTeam.team.teamName
      } with ${scoreSummary(homeScores)} vs. ${scoreSummary(awayScores)}`
    );
    return homeTeam;
  }
  if (result < 0) {
    await createGameLog(
      gameId,
      `${awayTeam.team.teamName} beat ${
        homeTeam.team.teamName
      } with ${scoreSummary(awayScores)} vs. ${scoreSummary(homeScores)}`
    );
    return awayTeam;
  }
  await createGameLog(
    gameId,
    `${awayTeam.team.teamName} and ${
      homeTeam.team.teamName
    } draw! With ${scoreSummary(awayScores)} vs. ${scoreSummary(homeScores)}`
  );
  return null;
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

function getTeamScores(team: TeamWithPlayer) {
  const homeScores = getLineupScores(team.players);
  homeScores.DEF += Math.floor(Math.random() * 12) + 1;
  homeScores.MID += Math.floor(Math.random() * 12) + 1;
  homeScores.FWD += Math.floor(Math.random() * 12) + 1;
  return homeScores;
}

async function playSim(gameId: string, seasonId: string, team: Team) {
  const teamSeason = await getTeamSeason(seasonId, team.id);
  const roll = Math.floor(Math.random() * 12) + 1;
  const rollBonus = Math.floor((teamSeason.startingScore - 20) / 20);
  if (roll >= 10 - rollBonus) {
    return await recordSimWin(gameId, teamSeason, team);
  }
  if (roll >= 8 - rollBonus) {
    return await recordSimDraw(gameId, teamSeason, team);
  }
  return await recordSimLoss(gameId, team);
}

async function recordSimWin(
  gameId: string,
  teamSeason: TeamSeason,
  team: Team
) {
  await createGameLog(gameId, `${team.teamName} win their SIM!`);
  await updateScoreOnTeamSeason(teamSeason.id, teamSeason.score + 6);
}

async function recordSimDraw(
  gameId: string,
  teamSeason: TeamSeason,
  team: Team
) {
  await createGameLog(gameId, `${team.teamName} draw their SIM`);
  await updateScoreOnTeamSeason(teamSeason.id, teamSeason.score + 2);
}

async function recordSimLoss(gameId: string, team: Team) {
  await createGameLog(
    gameId,
    `${team.teamName} lose their sim. The fans are chanting "GET ${team.managerName} OUT!"`
  );
}

async function calculateScoreForTeam(players: GamePlayer[]) {
  return players.reduce((acc, x) => acc + x.stars, 0);
}
