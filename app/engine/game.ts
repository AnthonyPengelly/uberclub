import type { Game } from "~/domain/games.server";
import { getGame, updateGameStage } from "~/domain/games.server";
import type { Team } from "~/domain/team.server";
import { getTeamById } from "~/domain/team.server";
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
import { MAX_TEAMS, resetStageOverrides } from "./team";
import { checkForCupWinner, prepareCup, prepareNextRound } from "./cup";
import { resetInjuredForGame } from "~/domain/players.server";
import { returnLoans } from "./loans";

export enum Stage {
  NotStarted = 0,
  Training = 1,
  Scouting = 2,
  Improvements = 3,
  DeadlineDay = 4,
  Match1 = 5,
  Match2 = 6,
  Match3 = 7,
  Match4 = 8,
  Match5 = 9,
  CupQuarterFinal = 10,
  CupSemiFinal = 11,
  CupFinal = 12,
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
  if (allTeams.length === MAX_TEAMS) {
    await startGame(
      teamInput.gameId,
      allTeams.map((x) => x.id as string)
    );
  }
}

export async function startGameEarly(game: Game) {
  if (game.stage !== Stage.NotStarted) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Game already started!",
    });
  }
  const allTeams = await getTeamsInGame(game.id);
  await startGame(
    game.id,
    allTeams.map((x) => x.id as string)
  );
}

async function startGame(gameId: string, teamIds: string[]) {
  await createGameLog(
    gameId,
    "Everyone is here, starting the game and randomising teams"
  );
  console.log("adding all players");
  const game = await getGame(gameId);
  await addAllPlayersToGame(game);
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
      await updateGameStage(gameId, Stage.Training);
      break;
    case Stage.Training:
    case Stage.Scouting:
    case Stage.Improvements:
      await resetStageOverrides(gameId);
      await setDeadlineDayPlayers(gameId);
      await updateGameStage(gameId, Stage.DeadlineDay);
      break;
    case Stage.DeadlineDay:
      await resolveDeadlineDay(gameId);
      await startSeason(gameId);
      await updateGameStage(gameId, Stage.Match1);
      break;
    case Stage.Match1:
      await playFixtures(gameId, Stage.Match1);
      await updateGameStage(gameId, Stage.Match2);
      break;
    case Stage.Match2:
      await playFixtures(gameId, Stage.Match2);
      await updateGameStage(gameId, Stage.Match3);
      break;
    case Stage.Match3:
      await playFixtures(gameId, Stage.Match3);
      await updateGameStage(gameId, Stage.Match4);
      break;
    case Stage.Match4:
      await playFixtures(gameId, Stage.Match4);
      await updateGameStage(gameId, Stage.Match5);
      break;
    case Stage.Match5:
      await playFixtures(gameId, Stage.Match5);
      await completeFinancesForAllTeams(gameId);
      if (await prepareCup(gameId)) {
        await updateGameStage(gameId, Stage.CupQuarterFinal);
        return false;
      } else {
        await createNextSeason(gameId);
        await updateGameStage(gameId, Stage.Training);
      }
      break;
    case Stage.CupQuarterFinal:
      await playFixtures(gameId, Stage.CupQuarterFinal);
      if (await prepareNextRound(gameId)) {
        await updateGameStage(gameId, Stage.CupSemiFinal);
        return false;
      } else {
        await createNextSeason(gameId);
        await updateGameStage(gameId, Stage.Training);
      }
      break;
    case Stage.CupSemiFinal:
      await playFixtures(gameId, Stage.CupSemiFinal);
      if (await prepareNextRound(gameId)) {
        await updateGameStage(gameId, Stage.CupFinal);
        return false;
      } else {
        await createNextSeason(gameId);
        await updateGameStage(gameId, Stage.Training);
      }
      break;
    case Stage.CupFinal:
      await playFixtures(gameId, Stage.CupFinal);
      await checkForCupWinner(gameId);
      await createNextSeason(gameId);
      await updateGameStage(gameId, Stage.Training);
      break;
  }
  // Reset all teams to unready
  return true;
}

async function createNextSeason(gameId: string) {
  const currentSeason = await getCurrentSeason(gameId);
  await createSeason(gameId, currentSeason.seasonNumber + 1);
  await resetInjuredForGame(gameId);
  await returnLoans(gameId);
}

export async function markTeamAsReady(gameId: string, team: Team) {
  await markAsReady(team.id);
  await createGameLog(gameId, `${team.managerName} is ready to continue`);
  const allTeams = await getTeamsInGame(gameId);
  if (allTeams.filter((x) => x.isReady).length === allTeams.length) {
    await createGameLog(gameId, "Everyone is ready, starting next phase");
    const resetReady = await advance(gameId);
    if (resetReady) {
      await Promise.all(
        allTeams.map((x) => markAsReady(x.id as string, false))
      );
    }
  }
}

export function canBuyOrSellPlayer(game: Game) {
  return (
    game.stage === Stage.Training ||
    game.stage === Stage.Scouting ||
    game.stage === Stage.Improvements ||
    game.stage === Stage.DeadlineDay
  );
}

export async function getGameWithStageOverride(gameId: string, teamId: string) {
  const game = await getGame(gameId);
  const team = await getTeamById(teamId);
  return overrideGameStageWithTeam(game, team);
}

export function overrideGameStageWithTeam(game: Game, team: Team) {
  game.stage = team.stageOverride || game.stage;
  return game;
}
