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
import {
  createPlayerTransfer,
  createTransferBid,
} from "~/domain/transferBids.server";
import { getTransferBidsForTeam } from "~/domain/transferBids.server";
import {
  getTransferBid,
  updateTransferBidStatus,
} from "~/domain/transferBids.server";
import { canBuyOrSellPlayer, overrideGameStageWithTeam } from "./game";

export enum Status {
  Pending = 0,
  Accepted = 1,
  Rejected = 2,
  Withdrawn = 3,
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
  await updateTransferBidStatus(bidId, Status.Rejected);
  await updateCash(newTeam.id, newTeam.cash + bid.cost);
  await createGameLog(
    game.id,
    `${team.teamName} have rejected an offer from ${
      newTeam.teamName
    } including ${bid.players.map((x) => x.name).join(", ")}!`
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
  const otherTeam = await getTeamById(bid.sellingTeamId);
  await updateTransferBidStatus(bidId, Status.Withdrawn);
  await updateCash(team.id, team.cash + bid.cost);
  await createGameLog(
    game.id,
    `${team.teamName} have withdrawn their bid to ${otherTeam.teamName}!`
  );
}

export async function acceptBid(bidId: string, sellingTeam: Team) {
  const game = await getGame(sellingTeam.gameId);
  overrideGameStageWithTeam(game, sellingTeam);
  const bid = await getTransferBid(bidId);
  if (bid.sellingTeamId !== sellingTeam.id) {
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
  if (bid.cost * -1 > sellingTeam.cash) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Not enough cash!",
    });
  }
  // TODO player limitations
  // const teamPlayers = await getTeamPlayers(team.id);
  // if (teamPlayers.length === 11) {
  //   throw new Response("Bad Request", {
  //     status: 400,
  //     statusText: "You don't have enough players to sell any more!",
  //   });
  // }
  const buyingTeam = await getTeamById(bid.buyingTeamId);
  await updateTransferBidStatus(bidId, Status.Accepted);
  await updateCash(sellingTeam.id, sellingTeam.cash + bid.cost);
  // For positive cash, the cash was taken at the time of creating the offer
  if (bid.cost < 0) {
    await updateCash(bid.buyingTeamId, buyingTeam.cash - bid.cost);
  }
  await createGameLog(
    game.id,
    bid.cost < 0
      ? `${sellingTeam.teamName} have sent ${buyingTeam.teamName} as part of a transfer negotiation`
      : `${buyingTeam.teamName} have sent ${sellingTeam.teamName} as part of a transfer negotiation`
  );
  await Promise.all(
    bid.players.map(async (x) => {
      await addPlayerToTeam(
        x.playerId,
        x.buyingTeam ? bid.sellingTeamId : bid.buyingTeamId
      );
      await updatePlayerLineupPosition(x.playerId, null, false);
      if (x.loan) {
        await updateLoanee(
          x.playerId,
          x.buyingTeam ? bid.buyingTeamId : bid.sellingTeamId
        );
      }
      await createGameLog(
        game.id,
        `${x.buyingTeam ? buyingTeam.teamName : sellingTeam.teamName} have ${
          x.loan ? "loaned" : "sold"
        } ${x.name} to ${
          x.buyingTeam ? sellingTeam.teamName : buyingTeam.teamName
        }`
      );

      const otherBids = (await getTransferBidsForTeam(sellingTeam.id)).filter(
        (y) =>
          y.players.find((z) => z.playerId === x.playerId) &&
          y.status === Status.Pending
      );
      await Promise.all(otherBids.map((x) => rejectBid(x.id, sellingTeam)));
    })
  );
}

export async function createBid(
  game: Game,
  team: Team,
  sellingTeamId: string,
  cost: number,
  playerIds: string[],
  loanPlayerIds: string[]
) {
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
  // TODO squad size
  const teamPlayers = await getTeamPlayers(team.id);

  const bidId = await createTransferBid(team.id, sellingTeamId, cost);
  if (cost > 0) {
    await updateCash(team.id, team.cash - cost);
  }
  await Promise.all(
    playerIds.map(async (id) => {
      const player = await getPlayer(id);
      await createPlayerTransfer(bidId, id, player.teamId === team.id, false);
    })
  );
  await Promise.all(
    loanPlayerIds.map(async (id) => {
      const player = await getPlayer(id);
      await createPlayerTransfer(bidId, id, player.teamId === team.id, true);
    })
  );

  const sellingTeam = await getTeamById(sellingTeamId);
  await createGameLog(
    team.gameId,
    `${team.teamName} have put an offer in to ${sellingTeam.teamName}!`
  );
}
