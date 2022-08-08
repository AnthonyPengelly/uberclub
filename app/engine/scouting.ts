import type { Team } from "~/domain/team.server";
import { updateCash } from "~/domain/team.server";
import {
  createGameLog,
  createScoutingLog,
  getScoutingLogsForSeason,
} from "~/domain/logs.server";
import {
  addPlayerToTeam,
  drawPlayersFromDeck,
  getPlayer,
  getTeamPlayers,
  markPlayerOutOfDeck,
} from "~/domain/players.server";
import { getCurrentSeason } from "~/domain/season.server";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { Stage } from "./game";
import { MAX_SQUAD_SIZE } from "./team";

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
  await createGameLog(
    team.gameId,
    `${team.teamName} have discovered a hidden gem: ${player.name} already playing at ${player.overall} stars`
  );
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
  const players = await getTeamPlayers(team.id);
  if (players.length === MAX_SQUAD_SIZE) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Too many players! Sell first",
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
