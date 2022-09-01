import type { Team } from "~/domain/team.server";
import { updateCash } from "~/domain/team.server";
import {
  createGameLog,
  createScoutingLog,
  getScoutingLogsForSeason,
} from "~/domain/logs.server";
import type { GamePlayer } from "~/domain/players.server";
import {
  addPlayerToTeam,
  drawPlayersFromDeck,
  getPlayer,
  markPlayerOutOfDeck,
} from "~/domain/players.server";
import { getCurrentSeason } from "~/domain/season.server";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { overrideGameStageWithTeam, Stage } from "./game";
import { MAX_SQUAD_SIZE } from "./team";
import { getSquadSize } from "./players";

export async function getScoutedPlayers(team: Team) {
  const season = await getCurrentSeason(team.gameId);
  const scoutedPlayerIds = await getScoutingLogsForSeason(season.id, team.id);
  const players = await Promise.all(scoutedPlayerIds.map((x) => getPlayer(x)));
  return players;
}

export async function scoutPlayer(team: Team) {
  const player = (await drawPlayersFromDeck(team.gameId, 1))[0];
  const season = await getCurrentSeason(team.gameId);
  await assertCanScout(team.gameId, season.id, team);
  await createScoutingLog(season.id, team.id, player.id);
  await markPlayerOutOfDeck(player.id);
  await createGameLog(team.gameId, getScoutReport(player, team));
  return player;
}

export async function buyScoutedPlayer(playerId: string, team: Team) {
  const player = await getPlayer(playerId);
  const cost = getScoutPrice(player.overall, player.potential);
  if (cost > team.cash) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Not enough cash!",
    });
  }
  const squadSize = await getSquadSize(team);
  if (squadSize.committedSize === MAX_SQUAD_SIZE) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Too many players! Sell first, or withdraw transfer bids",
    });
  }
  await addPlayerToTeam(playerId, team.id);
  await updateCash(team.id, team.cash - cost);
  await createGameLog(
    team.gameId,
    `${team.managerName} has picked up ${
      player.name
    } for the bargain price of ${getScoutPrice(
      player.overall,
      player.potential
    )}M`
  );
}

export const getScoutPrice = (overall: number, potential: number) => {
  const priceFromOverall = getScoutPriceFromOverall(overall);
  if (potential > overall) {
    return priceFromOverall + potential;
  }
  return priceFromOverall;
};

const getScoutPriceFromOverall = (overall: number) => {
  switch (overall) {
    case 1:
    case 2:
    case 3:
      return 5 * overall;
    case 4:
      return 22;
    case 5:
      return 30;
    case 6:
      return 40;
    default:
      throw overall;
  }
};

export async function getScoutingLogs(team: Team) {
  const season = await getCurrentSeason(team.gameId);
  return await getScoutingLogsForSeason(season.id, team.id);
}

async function assertCanScout(gameId: string, seasonId: string, team: Team) {
  const game = await getGame(gameId);
  overrideGameStageWithTeam(game, team);
  const scoutingLogs = await getScoutingLogsForSeason(seasonId, team.id);
  if (!canScout(game, scoutingLogs, team)) {
    throw new Error("Not currently able to scout");
  }
}

export function canScout(
  game: Game,
  scoutingLogs: { id: string }[],
  team: Team
) {
  if (game.stage !== Stage.Scouting) {
    return false;
  }
  if (scoutingLogs.length >= team.scoutingLevel) {
    return false;
  }
  return true;
}

export function getScoutReport(player: GamePlayer, team: Team) {
  if (player.overall >= 6) {
    return `World class player ${player.name} has been causing all sorts of drama in the ${player.team} dressing room and they are desperate to offload the hefty wage bill on someone else. They are rumoured to have offered the ${player.overall} star player to ${team.teamName}.`;
  }
  if (player.overall >= 5) {
    return `${player.team} star ${player.name} is refusing to sign a new contract. The ${player.overall} star ${player.position} has expressed an interest in a move to ${team.teamName} instead.`;
  }
  if (player.potential >= 5) {
    return `On the scouts advice, ${team.teamName} are lining up a shock move for wonderkid ${player.name}, currently playing at ${player.overall}.`;
  }
  if (player.overall === player.potential && player.overall >= 3) {
    return `${player.team} have offered ${team.managerName} ${player.overall} star player ${player.name}, who already has experience at this level and could bring a lot to ${team.teamName}.`;
  }
  if (player.potential > player.overall) {
    return `The ${team.teamName} scouts have identified ${player.overall} star ${player.position} ${player.name} as one to watch.`;
  }
  return `Against their scouts' advice, ${team.managerName} is hoping that veteran ${player.name} can bring his experience to the ${team.teamName} dressing room.`;
}
