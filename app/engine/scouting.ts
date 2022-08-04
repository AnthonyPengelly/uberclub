import type { Team } from "~/domain/team.server";
import { updateCash } from "~/domain/team.server";
import {
  createScoutingLog,
  getScoutingLogsForSeason,
} from "~/domain/logs.server";
import {
  addPlayerToTeam,
  drawPlayerFromDeck,
  getPlayer,
  markPlayerOutOfDeck,
} from "~/domain/players.server";
import { getCurrentSeason } from "~/domain/season.server";

export async function getScoutedPlayers(team: Team) {
  const season = await getCurrentSeason(team.gameId);
  const scoutedPlayerIds = await getScoutingLogsForSeason(season.id, team.id);
  const players = await Promise.all(scoutedPlayerIds.map((x) => getPlayer(x)));
  return players;
}

export async function scoutPlayer(team: Team) {
  const player = await drawPlayerFromDeck(team.gameId);
  const season = await getCurrentSeason(team.gameId);
  await createScoutingLog(season.id, team.id, player.id);
  await markPlayerOutOfDeck(player.id);
  return player;
}

export async function buyScoutedPlayer(playerId: string, team: Team) {
  const player = await getPlayer(playerId);
  const cost = getScoutPrice(player.overall, player.potential);
  await addPlayerToTeam(playerId, team.id);
  await updateCash(team.id, team.cash - cost);
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
