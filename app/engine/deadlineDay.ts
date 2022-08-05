import invariant from "tiny-invariant";
import type { Bid, DeadlineDayPlayer } from "~/domain/deadlineDay.server";
import {
  createDeadlineDayBid,
  createDeadlineDayPlayers,
  getBidsForPlayer,
  getBidsForTeam,
  getDeadlineDayPlayers,
} from "~/domain/deadlineDay.server";
import { createGameLog } from "~/domain/logs.server";
import { GamePlayer, getTeamPlayers } from "~/domain/players.server";
import { addPlayerToTeam } from "~/domain/players.server";
import {
  drawPlayersFromDeck,
  markPlayerOutOfDeck,
} from "~/domain/players.server";
import { getCurrentSeason } from "~/domain/season.server";
import type { Team } from "~/domain/team.server";
import { getTeamsInGame, updateCash } from "~/domain/team.server";

export async function setDeadlineDayPlayers(gameId: string) {
  const players = await drawPlayersFromDeck(gameId, 5);
  const season = await getCurrentSeason(gameId);
  await createDeadlineDayPlayers(season.id, players);
  await Promise.all(players.map((x) => markPlayerOutOfDeck(x.id)));
  await createGameLog(
    gameId,
    `Deadline day is here! Players up for grabs: ${players
      .map((x) => x.name)
      .join(", ")}`
  );
}

export async function bidForPlayer(
  playerId: string,
  team: Team,
  bids: Bid[],
  cost: number
) {
  const season = await getCurrentSeason(team.gameId);
  const players = await getDeadlineDayPlayers(season.id);
  const player = players.find((x) => x.deadlineDayId === playerId);
  invariant(player?.id, "Cannot find deadline day player");
  const playerValue = minBidPrice(player);
  if (cost < playerValue) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Bid too small",
    });
  }
  if (team.cash < cost) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Not enough cash!",
    });
  }
  const teamPlayers = await getTeamPlayers(team.id);
  if (teamPlayers.length + bids.length === 23) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Too many players! Sell first",
    });
  }
  await createDeadlineDayBid(team.id, player.deadlineDayId, cost);
  await updateCash(team.id, team.cash - cost);
  await createGameLog(
    team.gameId,
    `${team.managerName} submitted a bid for ${player.name}`
  );
}

export async function resolveDeadlineDay(gameId: string) {
  const season = await getCurrentSeason(gameId);
  const teams = await getTeamsInGame(gameId);
  const players = await getDeadlineDayPlayers(season.id);
  await Promise.all(
    players.map((x) => resolveDeadlineDayPlayer(x, gameId, teams as Team[]))
  );
}

export async function resolveDeadlineDayPlayer(
  player: DeadlineDayPlayer,
  gameId: string,
  teams: Team[]
) {
  const bids = await getBidsForPlayer(player.deadlineDayId);
  if (bids.length === 0) {
    await createGameLog(gameId, `No bids were made for ${player.name}!`);
    return;
  }
  const sortedBids = bids.sort((a, b) => b.cost - a.cost);
  const drawnBids = sortedBids.filter((x) => x.cost === sortedBids[0].cost);
  const winner =
    drawnBids.length === 1
      ? (teams.find((x) => x.id === sortedBids[0].teamId) as Team)
      : pickWinnerFromDraw(drawnBids, teams);
  if (sortedBids.length === 1) {
    await createGameLog(
      gameId,
      `${player.name} was picked up by ${winner.managerName} with the only bid at ${sortedBids[0].cost}M!`
    );
  } else if (drawnBids.length !== 1) {
    await createGameLog(
      gameId,
      `The bid was a draw! ${player.name} joins ${
        winner.teamName
      } as they have a lower budget, soz. They will pay ${
        sortedBids[0].cost
      }M. With competing bids of ${sortedBids
        .slice(1)
        .map((x) => `${x.cost}M`)
        .join(", ")}`
    );
  } else {
    await createGameLog(
      gameId,
      `${winner.managerName} won the battle for ${player.name} with ${
        sortedBids[0].cost
      }M. Beating competing bids of ${sortedBids
        .slice(1)
        .map((x) => `${x.cost}M`)
        .join(", ")}`
    );
  }
  await addPlayerToTeam(player.id, winner.id);
  await Promise.all(
    sortedBids.slice(1).map((x) => {
      const team = teams.find((team) => team.id === x.teamId) as Team;
      return updateCash(team.id, team.cash + x.cost);
    })
  );
}

export function pickWinnerFromDraw(bids: Bid[], teams: Team[]) {
  const sortedTeams = teams.sort((a, b) => a.cash - b.cash);
  return sortedTeams.find((x) => bids.find((y) => y.teamId === x.id)) as Team;
}

export async function deadlineDayPlayers(gameId: string) {
  const season = await getCurrentSeason(gameId);
  return await getDeadlineDayPlayers(season.id);
}

export async function bidsForTeam(team: Team) {
  const season = await getCurrentSeason(team.gameId);
  return await getBidsForTeam(team.id, season.id);
}

export function minBidPrice(player: GamePlayer) {
  const priceFromOverall = player.overall * 10;
  if (player.potential > player.overall) {
    return priceFromOverall + player.potential;
  }
  return priceFromOverall;
}
