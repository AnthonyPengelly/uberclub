import type { Team } from "~/domain/team.server";
import { updateCash, updateImprovements } from "~/domain/team.server";
import {
  createGameLog,
  createImprovementLog,
  getImprovementLogsForSeason,
} from "~/domain/logs.server";
import { getCurrentSeason } from "~/domain/season.server";
import { overrideGameStageWithTeam, Stage } from "./game";
import { getGame } from "~/domain/games.server";

export enum Improvements {
  Training = 0,
  Scouting = 1,
  Stadium = 2,
}

const ImprovementsAllowed = 2;

export async function improve(team: Team, improvement: Improvements) {
  const season = await getCurrentSeason(team.gameId);
  await assertCanImprove(team.gameId, season.id, team);
  const cost = improvementCost(team, improvement);
  if (cost === null) {
    throw new Error("Unable to improve further");
  }
  if (cost > team.cash) {
    throw new Error("Not enough cash!");
  }
  await createGameLog(
    team.gameId,
    `${team.teamName} Invest ${cost}M in their ${Improvements[improvement]}`
  );
  await updateImprovements(
    team.id,
    improvement === Improvements.Training
      ? team.trainingLevel + 1
      : team.trainingLevel,
    improvement === Improvements.Scouting
      ? team.scoutingLevel + 1
      : team.scoutingLevel,
    improvement === Improvements.Stadium
      ? team.stadiumLevel + 1
      : team.stadiumLevel
  );
  await updateCash(team.id, team.cash - cost);
  await createImprovementLog(season.id, team.id);
}

export async function hasImprovementsRemaining(team: Team) {
  const season = await getCurrentSeason(team.gameId);
  return await canImprove(team.gameId, season.id, team);
}

async function assertCanImprove(gameId: string, seasonId: string, team: Team) {
  if (!canImprove(gameId, seasonId, team)) {
    throw new Error("Not currently able to improve");
  }
}

async function canImprove(gameId: string, seasonId: string, team: Team) {
  const game = await getGame(gameId);
  overrideGameStageWithTeam(game, team);
  const improvementLogs = await getImprovementLogsForSeason(seasonId, team.id);
  if (game.stage !== Stage.Improvements) {
    return false;
  }
  if (improvementLogs.length >= ImprovementsAllowed) {
    return false;
  }
  return true;
}

export function improvementCost(team: Team, improvement: Improvements) {
  switch (improvement) {
    case Improvements.Training:
      if (team.trainingLevel >= 8) {
        return null;
      }
      return 15 * Math.pow(2, team.trainingLevel - 1);
    case Improvements.Scouting:
      if (team.scoutingLevel >= 8) {
        return null;
      }
      return 15 * Math.pow(2, team.scoutingLevel - 1);
    case Improvements.Stadium:
      if (team.stadiumLevel >= 8) {
        return null;
      }
      return 20 * Math.pow(2, team.stadiumLevel - 1);
    default:
      throw new Error("unsupported improvement");
  }
}
