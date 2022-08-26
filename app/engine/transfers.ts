import invariant from "tiny-invariant";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { createGameLog } from "~/domain/logs.server";
import {
  addPlayerToTeam,
  getPlayer,
  updateLoanee,
  updatePlayerLineupPosition,
} from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import type { Team } from "~/domain/team.server";
import { getTeamById, updateCash } from "~/domain/team.server";
import type { TransferBid } from "~/domain/transferBids.server";
import { getTransferBidsForTeam } from "~/domain/transferBids.server";
import {
  getTransferBid,
  updateTransferBidStatus,
} from "~/domain/transferBids.server";
import { createTransferBidForPlayer } from "~/domain/transferBids.server";
import { canBuyOrSellPlayer, overrideGameStageWithTeam } from "./game";
import { MAX_SQUAD_SIZE } from "./team";

export enum Status {
  Pending = 0,
  Accepted = 1,
  Rejected = 2,
  Withdrawn = 3,
}

export async function makeBidForPlayer(
  team: Team,
  playerId: string,
  cost: number,
  bids: TransferBid[],
  game: Game,
  loan: boolean
) {
  invariant(playerId, "invalid player");
  const player = await getPlayer(playerId);
  overrideGameStageWithTeam(game, team);

  if (!canBuyOrSellPlayer(game)) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Can only put bids in in pre-season!",
    });
  }
  if (team.cash < cost) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Not enough cash!",
    });
  }
  const teamPlayers = await getTeamPlayers(team.id);
  if (teamPlayers.length + bids.length === MAX_SQUAD_SIZE) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Too many players! Sell first",
    });
  }
  await createTransferBidForPlayer(team.id, player, cost, loan);
  await updateCash(team.id, team.cash - cost);
  await createGameLog(
    team.gameId,
    `${team.teamName} have put in a bid for ${player.name}!`
  );
}

export async function rejectBid(bidId: string, team: Team) {
  const game = await getGame(team.gameId);
  overrideGameStageWithTeam(game, team);
  const bid = await getTransferBid(bidId);
  if (bid.sellingTeamId !== team.id) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Not your bid to reject!",
    });
  }
  if (bid.status !== Status.Pending) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Bid is no longer valid!",
    });
  }
  const newTeam = await getTeamById(bid.buyingTeamId);
  const player = await getPlayer(bid.playerGameStateId);
  await updateTransferBidStatus(bidId, Status.Rejected);
  await updateCash(newTeam.id, newTeam.cash + bid.cost);
  await createGameLog(
    game.id,
    `${team.teamName} have rejected a ${bid.cost}M ${
      bid.loan ? "loan" : "transfer"
    } bid from ${newTeam.teamName} for ${player.name}!`
  );
}

export async function withdrawBid(bidId: string, team: Team) {
  const game = await getGame(team.gameId);
  overrideGameStageWithTeam(game, team);
  const bid = await getTransferBid(bidId);
  if (bid.buyingTeamId !== team.id) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Not your bid to withdraw!",
    });
  }
  if (bid.status !== Status.Pending) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Bid is no longer valid!",
    });
  }
  const player = await getPlayer(bid.playerGameStateId);
  await updateTransferBidStatus(bidId, Status.Withdrawn);
  await updateCash(team.id, team.cash + bid.cost);
  await createGameLog(
    game.id,
    `${team.teamName} have withdrawn their bid for ${player.name}!`
  );
}

export async function acceptBid(bidId: string, team: Team) {
  const game = await getGame(team.gameId);
  overrideGameStageWithTeam(game, team);
  const bid = await getTransferBid(bidId);
  if (bid.sellingTeamId !== team.id) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Not your player to sell!",
    });
  }
  if (bid.status !== Status.Pending) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Bid is no longer valid!",
    });
  }
  if (!canBuyOrSellPlayer(game)) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Can only accept bids in in pre-season!",
    });
  }
  const teamPlayers = await getTeamPlayers(team.id);
  if (teamPlayers.length === 11) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "You don't have enough players to sell any more!",
    });
  }
  const newTeam = await getTeamById(bid.buyingTeamId);
  const player = await getPlayer(bid.playerGameStateId);
  await updateTransferBidStatus(bidId, Status.Accepted);
  await updateCash(team.id, team.cash + bid.cost);
  await addPlayerToTeam(bid.playerGameStateId, bid.buyingTeamId);
  await updatePlayerLineupPosition(bid.playerGameStateId, null, false);
  if (bid.loan) {
    await updateLoanee(bid.playerGameStateId, bid.sellingTeamId);
  }
  await createGameLog(
    game.id,
    `${team.teamName} have ${bid.loan ? "loaned" : "sold"} ${player.name} to ${
      newTeam.teamName
    } for ${bid.cost}M!`
  );
  const otherBids = (await getTransferBidsForTeam(team.id)).filter(
    (x) =>
      x.playerGameStateId === bid.playerGameStateId &&
      x.status === Status.Pending
  );
  await Promise.all(otherBids.map((x) => rejectBid(x.id, team)));
}
