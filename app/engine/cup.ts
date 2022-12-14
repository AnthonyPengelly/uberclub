import { createCupLeaderboardEntry } from "~/domain/leaderboard.server";
import {
  createResult,
  getResults,
  getResultsForStage,
} from "~/domain/fixtures.server";
import type { Game } from "~/domain/games.server";
import { getGame, recordWinner } from "~/domain/games.server";
import { createGameLog } from "~/domain/logs.server";
import { getPlayersList } from "~/domain/players.server";
import {
  getAllSeasons,
  getCurrentSeason,
  getTeamSeason,
  getTeamSeasons,
} from "~/domain/season.server";
import { getTeamsInGame, markAsReady } from "~/domain/team.server";
import { getTeamById } from "~/domain/team.server";
import { Stage } from "./game";
import { mapTeamSeasonsToPosition } from "./leagueTable";

export async function prepareCup(gameId: string) {
  const game = await getGame(gameId);
  if (!(await winnerHasQualifiedForCup(game))) {
    return false;
  }
  const season = await getCurrentSeason(gameId);
  const teamSeason = (await getTeamSeasons(season.id)).sort(
    (a, b) => b.score - a.score
  )[0];
  const team = await getTeamById(teamSeason.teamId);
  await createGameLog(gameId, `${team.teamName} has qualified for the cup!`);
  await createRandomCupFixture(season.id, team.id, game);

  // Only 1 team needs to take an action
  await markAsReady(team.id, false);
  return true;
}

async function winnerHasQualifiedForCup(game: Game) {
  const seasons = await getAllSeasons(game.id);
  const seasonsMap = await Promise.all(
    seasons
      .map(async (x) => ({
        season: x,
        teamSeasons: await getTeamSeasons(x.id),
        results: await getResults(x.id),
      }))
      .map(async (x) => ({
        season: (await x).season,
        teamSeasons: mapTeamSeasonsToPosition(await x),
      }))
  );
  const season = seasonsMap.filter(
    (x) => x.season.seasonNumber === seasons.length
  )[0];
  const winningTeamSeason = season.teamSeasons.filter(
    (x) => x.position === 1
  )[0];
  const totalWins = seasonsMap
    .map((x) => x.teamSeasons.filter((y) => y.position === 1)[0].teamId)
    .filter((x) => x === winningTeamSeason.teamId).length;
  return totalWins >= 3;
}

export async function prepareNextRound(gameId: string) {
  const game = await getGame(gameId);
  const season = await getCurrentSeason(gameId);
  const lastRound = (await getResultsForStage(season.id, game.stage))[0];
  if (lastRound.winningTeamId !== lastRound.homeTeamId) {
    return false;
  }
  const team = await getTeamById(lastRound.homeTeamId);
  await createGameLog(
    gameId,
    `${team.teamName} has progressed to the next round of the cup!`
  );
  await createRandomCupFixture(season.id, team.id, game);

  // Only 1 team needs to take an action
  await markAsReady(team.id, false);
  return true;
}

async function createRandomCupFixture(
  seasonId: string,
  teamId: string,
  game: Game
) {
  const allPlayers = await getPlayersList(game.playerCollectionId);
  const existingCupMatches = [
    ...(await getResultsForStage(seasonId, Stage.CupQuarterFinal)),
    ...(await getResultsForStage(seasonId, Stage.CupSemiFinal)),
  ];
  const teamIdByBestPlayer = allPlayers
    .sort((a, b) => b.potential - a.potential)
    .sort((a, b) => b.overall - a.overall)
    .map((x) => x.realTeamId)
    // Deduplicate and maintain order
    .filter((id, i, array) => array.indexOf(id) === i)
    .filter((x) => !existingCupMatches.find((y) => y.realTeamId === x))
    .slice(0, 6);
  const randomTeamId = teamIdByBestPlayer.sort(() => 0.5 - Math.random())[0];
  await createCupMatch(teamId, randomTeamId, seasonId, game.stage + 1);
}

async function createCupMatch(
  teamId: string,
  opponentId: string,
  seasonId: string,
  stage: Stage
) {
  return await createResult({
    seasonId: seasonId,
    stage: stage,
    homeTeamId: teamId,
    realTeamId: opponentId,
  });
}

export async function checkForCupWinner(gameId: string) {
  const game = await getGame(gameId);
  const season = await getCurrentSeason(gameId);
  const final = (await getResultsForStage(season.id, game.stage))[0];
  if (final.winningTeamId === final.homeTeamId) {
    const team = await getTeamById(final.homeTeamId);
    await createGameLog(
      gameId,
      `******************************* ${team.managerName} has led ${team.teamName} to a cup victory, congratulations! *******************************`
    );
    await recordWinner(gameId, team.teamName);
    const teamSeason = await getTeamSeason(season.id, team.id);
    const teams = await getTeamsInGame(game.id);
    await createCupLeaderboardEntry(
      game.name,
      team.teamName,
      team.managerName,
      season.seasonNumber,
      teamSeason.score,
      teams.length,
      `/games/${game.id}/results/${final.id}`
    );
  }
}
