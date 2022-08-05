import type { Team } from "~/domain/team.server";
import {
  createGameLog,
  createTrainingLog,
  getTrainingLogsForSeason,
} from "~/domain/logs.server";
import { getPlayer, updatePlayerStars } from "~/domain/players.server";
import { getCurrentSeason } from "~/domain/season.server";
import { Stage } from "./game";
import { getGame } from "~/domain/games.server";

export async function trainPlayer(playerId: string, team: Team) {
  const player = await getPlayer(playerId);
  const season = await getCurrentSeason(team.gameId);
  await assertCanTrain(team.gameId, season.id, team);
  const maxImprovement = team.trainingLevel;
  const diceRoll = Math.floor(Math.random() * 6) + 1;
  const improvement = Math.max(
    0,
    Math.min(
      maxImprovement,
      diceRoll - player.stars,
      player.potential - player.stars
    )
  );
  if (improvement === 0) {
    await createGameLog(
      team.gameId,
      `${player.name} didn't turn up to ${team.teamName} training`
    );
  } else {
    await createGameLog(
      team.gameId,
      `${team.managerName} trained ${player.name} from ${player.stars} to ${
        player.stars + improvement
      } stars`
    );
  }
  await updatePlayerStars(playerId, player.stars + improvement);
  await createTrainingLog(season.id, team.id, improvement);
}

export async function hasTrainingRemaining(team: Team) {
  const season = await getCurrentSeason(team.gameId);
  return await canTrain(team.gameId, season.id, team);
}

async function assertCanTrain(gameId: string, seasonId: string, team: Team) {
  if (!canTrain(gameId, seasonId, team)) {
    throw new Error("Not currently able to train");
  }
}

async function canTrain(gameId: string, seasonId: string, team: Team) {
  const game = await getGame(gameId);
  const trainingLogs = await getTrainingLogsForSeason(seasonId, team.id);
  if (game.stage !== Stage.Training) {
    return false;
  }
  if (trainingLogs.length >= team.trainingLevel) {
    return false;
  }
  return true;
}
