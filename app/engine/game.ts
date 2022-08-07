import type { Game } from "~/domain/games.server";
import { getGame, updateGameStage } from "~/domain/games.server";
import type { Team } from "~/domain/team.server";
import {
  addTeamToGame,
  getTeamsInGame,
  markAsReady,
} from "~/domain/team.server";
import { createSeason, getCurrentSeason } from "~/domain/season.server";
import { performDraft } from "./draft";
import { addAllPlayersToGame } from "./players";
import { createGameLog } from "~/domain/logs.server";
import { resolveDeadlineDay, setDeadlineDayPlayers } from "./deadlineDay";
import { playFixtures, startSeason } from "./season";
import { completeFinancesForAllTeams } from "./finances";

export enum Stage {
  NotStarted = 0,
  Training = 1,
  Scouting = 2,
  Improvements = 3,
  DeadlineDay = 4,
  Match1 = 5,
  Match2 = 6,
  Match3 = 7,
  SuperCup = 8,
}

export function isOpenForPlayers(game: Game) {
  return game.stage === 0;
}

export async function joinGame(teamInput: {
  userId: string;
  gameId: string;
  teamName: string;
  managerName: string;
}) {
  await addTeamToGame(teamInput);
  await createGameLog(
    teamInput.gameId,
    `${teamInput.managerName} joined the game!`
  );
  const allTeams = await getTeamsInGame(teamInput.gameId);
  if (allTeams.length === 4) {
    await startGame(
      teamInput.gameId,
      allTeams.map((x) => x.id as string)
    );
  }
}

async function startGame(gameId: string, teamIds: string[]) {
  await createGameLog(
    gameId,
    "Everyone is here, starting the game and randomising teams"
  );
  console.log("adding all players");
  await addAllPlayersToGame(gameId);
  await createSeason(gameId, 1);
  console.log("doing draft");
  await performDraft(gameId, teamIds);
  await advance(gameId);
}

async function advance(gameId: string) {
  console.log("advancing game");
  const game = await getGame(gameId);
  switch (game.stage) {
    case Stage.NotStarted:
      return updateGameStage(gameId, Stage.Training);
    case Stage.Training:
      return updateGameStage(gameId, Stage.Scouting);
    case Stage.Scouting:
      return updateGameStage(gameId, Stage.Improvements);
    case Stage.Improvements:
      await setDeadlineDayPlayers(gameId);
      return updateGameStage(gameId, Stage.DeadlineDay);
    case Stage.DeadlineDay:
      await resolveDeadlineDay(gameId);
      await startSeason(gameId);
      return updateGameStage(gameId, Stage.Match1);
    case Stage.Match1:
      await startSeason(gameId);
      await playFixtures(gameId, Stage.Match1);
      return updateGameStage(gameId, Stage.Match2);
    case Stage.Match2:
      await playFixtures(gameId, Stage.Match2);
      return updateGameStage(gameId, Stage.Match3);
    case Stage.Match3:
      await playFixtures(gameId, Stage.Match3);
      await completeFinancesForAllTeams(gameId);
      await createNextSeason(gameId);
      return updateGameStage(gameId, Stage.Training);
    case Stage.SuperCup:
      return updateGameStage(gameId, Stage.Training);
  }
}

async function createNextSeason(gameId: string) {
  const currentSeason = await getCurrentSeason(gameId);
  await createSeason(gameId, currentSeason.seasonNumber + 1);
}

export async function markTeamAsReady(gameId: string, team: Team) {
  await markAsReady(team.id);
  await createGameLog(gameId, `${team.managerName} is ready to continue`);
  const allTeams = await getTeamsInGame(gameId);
  if (allTeams.filter((x) => x.isReady).length === 4) {
    await createGameLog(gameId, "Everyone is ready, starting next phase");
    await advance(gameId);
    await Promise.all(allTeams.map((x) => markAsReady(x.id as string, false)));
  }
}

export function canSellPlayer(game: Game) {
  return (
    game.stage === Stage.Training ||
    game.stage === Stage.Scouting ||
    game.stage === Stage.Improvements ||
    game.stage === Stage.DeadlineDay
  );
}
