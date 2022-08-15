import type { Team } from "~/domain/team.server";
import {
  createGameLog,
  createTrainingLog,
  getTrainingLogsForSeason,
} from "~/domain/logs.server";
import { getPlayer, updatePlayerStars } from "~/domain/players.server";
import { getCurrentSeason } from "~/domain/season.server";
import { overrideGameStageWithTeam, Stage } from "./game";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";

export async function trainPlayer(playerId: string, team: Team) {
  const player = await getPlayer(playerId);
  if (player.stars === 6) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Player already 6 stars!",
    });
  }
  const season = await getCurrentSeason(team.gameId);
  await assertCanTrain(team.gameId, season.id, team);
  await createGameLog(
    team.gameId,
    `${team.managerName} trained ${player.name} from ${player.stars} to ${
      player.stars + 1
    } stars`
  );
  await updatePlayerStars(playerId, player.stars + 1);
  await createTrainingLog(season.id, team.id, 1);
}

export async function getTrainingLogs(team: Team) {
  const season = await getCurrentSeason(team.gameId);
  return await getTrainingLogsForSeason(season.id, team.id);
}

async function assertCanTrain(gameId: string, seasonId: string, team: Team) {
  const game = await getGame(gameId);
  overrideGameStageWithTeam(game, team);
  const trainingLogs = await getTrainingLogsForSeason(seasonId, team.id);
  if (!canTrain(game, trainingLogs, team)) {
    throw new Error("Not currently able to train");
  }
}

export function canTrain(
  game: Game,
  trainingLogs: { id: string }[],
  team: Team
) {
  if (game.stage !== Stage.Training) {
    return false;
  }
  if (trainingLogs.length >= team.trainingLevel) {
    return false;
  }
  return true;
}
