import type { Team } from "~/domain/games.server";
import {
  createTrainingLog,
  getTrainingLogsForSeason,
} from "~/domain/logs.server";
import { getPlayer, updatePlayerStars } from "~/domain/players.server";
import { getCurrentSeason } from "~/domain/season.server";

export async function trainPlayer(playerId: string, team: Team) {
  const player = await getPlayer(playerId);
  const season = await getCurrentSeason(team.gameId);
  const maxImprovement = team.trainingLevel;
  const diceRoll = Math.floor(Math.random() * 6) + 1;
  const improvement = Math.max(
    0,
    Math.min(maxImprovement, diceRoll - player.stars)
  );
  await updatePlayerStars(playerId, player.stars + improvement);
  await createTrainingLog(season.id, team.id, improvement);
}

export async function hasTrainingRemaining(team: Team) {
  const season = await getCurrentSeason(team.gameId);
  const amountOfTraining = team.trainingLevel;
  const trainingLogs = await getTrainingLogsForSeason(season.id, team.id);
  return amountOfTraining > trainingLogs.length;
}
