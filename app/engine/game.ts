import type { Game } from "~/domain/games.server";
import { getGame, updateGameStage } from "~/domain/games.server";
import { addTeamToGame, getTeamsInGame } from "~/domain/team.server";
import { createSeason } from "~/domain/season.server";
import { performDraft } from "./draft";
import { addAllPlayersToGame } from "./players";

export enum Stage {
  NotStarted = 0,
  Training = 1,
  Scouting = 2,
  Investments = 3,
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
  const allTeams = await getTeamsInGame(teamInput.gameId);
  if (allTeams.length === 4) {
    await startGame(
      teamInput.gameId,
      allTeams.map((x) => x.id as string)
    );
  }
}

async function startGame(gameId: string, teamIds: string[]) {
  console.log("adding all players");
  await addAllPlayersToGame(gameId);
  await createSeason(gameId, 1);
  console.log("doing draft");
  await performDraft(gameId, teamIds);
  console.log("advancing game");
  await advance(gameId);
}

async function advance(gameId: string) {
  const game = await getGame(gameId);
  switch (game.stage) {
    case Stage.NotStarted:
      return updateGameStage(gameId, Stage.Training);
    case Stage.Training:
      return updateGameStage(gameId, Stage.Scouting);
    case Stage.Scouting:
      return updateGameStage(gameId, Stage.Investments);
    case Stage.Investments:
      return updateGameStage(gameId, Stage.DeadlineDay);
    case Stage.DeadlineDay:
      return updateGameStage(gameId, Stage.Match1);
    case Stage.Match1:
      return updateGameStage(gameId, Stage.Match2);
    case Stage.Match2:
      return updateGameStage(gameId, Stage.Match3);
    case Stage.Match3:
      return updateGameStage(gameId, Stage.Match3);
    case Stage.SuperCup:
      return updateGameStage(gameId, Stage.Training);
  }
}
