import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { createGameLog } from "~/domain/logs.server";
import {
  addPlayerToTeam,
  getPlayer,
  updateLoanee,
  updatePlayerLineupPosition,
} from "~/domain/players.server";
import type { Team } from "~/domain/team.server";
import { getTeamById, updateCash } from "~/domain/team.server";
import type { TransferBid } from "~/domain/transferBids.server";
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
import { getSquadSize } from "./players";
import { MAX_SQUAD_SIZE } from "./team";

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
  await handleBidRejection(game.id, bid, newTeam, team);
}

async function handleBidRejection(
  gameId: string,
  bid: TransferBid,
  buyingTeam: Team,
  sellingTeam: Team
) {
  await updateTransferBidStatus(bid.id, Status.Rejected);
  if (bid.cost > 0) {
    await updateCash(buyingTeam.id, buyingTeam.cash + bid.cost);
  }
  await createGameLog(
    gameId,
    `${sellingTeam.teamName} have rejected an offer from ${
      buyingTeam.teamName
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
  if (bid.cost > 0) {
    await updateCash(team.id, team.cash + bid.cost);
  }
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
  const squadSize = await getSquadSize(sellingTeam);
  const playerBalance =
    bid.players.filter((x) => x.buyingTeam).length -
    bid.players.filter((x) => !x.buyingTeam).length;
  if (playerBalance < 0 && squadSize.squadSize + playerBalance < 11) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "You don't have enough players to sell any more!",
    });
  }
  if (
    playerBalance > 0 &&
    squadSize.committedSize + playerBalance > MAX_SQUAD_SIZE
  ) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "You don't have space in your squad for these players!",
    });
  }
  const buyingTeam = await getTeamById(bid.buyingTeamId);
  await updateTransferBidStatus(bidId, Status.Accepted);
  await updateCash(sellingTeam.id, sellingTeam.cash + bid.cost);
  // For positive cash, the cash was taken at the time of creating the offer
  if (bid.cost < 0) {
    await updateCash(bid.buyingTeamId, buyingTeam.cash - bid.cost);
  }
  if (bid.cost !== 0) {
    await createGameLog(
      game.id,
      bid.cost < 0
        ? `${sellingTeam.teamName} have sent ${buyingTeam.teamName} ${
            bid.cost * -1
          }M as part of a transfer negotiation`
        : `${buyingTeam.teamName} have sent ${sellingTeam.teamName} ${bid.cost}M as part of a transfer negotiation`
    );
  }
  const bidsToReject: string[] = [];
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

      otherBids.forEach((y) => {
        bidsToReject.push(y.id);
      });
    })
  );
  await Promise.all(
    [...new Set(bidsToReject)].map(async (bidId) => {
      const bid = await getTransferBid(bidId);
      const buyingTeam = await getTeamById(bid.buyingTeamId);
      const sellingTeam = await getTeamById(bid.sellingTeamId);
      handleBidRejection(game.id, bid, buyingTeam, sellingTeam);
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

  const players = await Promise.all(playerIds.map((x) => getPlayer(x)));
  const loanPlayers = await Promise.all(loanPlayerIds.map((x) => getPlayer(x)));

  const squadSize = await getSquadSize(team);
  // how many players this team would be set to gain
  const playerBalance =
    [...players, ...loanPlayers].filter((x) => team.id !== x.teamId).length -
    [...players, ...loanPlayers].filter((x) => team.id === x.teamId).length;
  if (playerBalance < 0 && squadSize.squadSize + playerBalance < 11) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "You don't have enough players to sell any more!",
    });
  }
  if (
    playerBalance > 0 &&
    squadSize.committedSize + playerBalance > MAX_SQUAD_SIZE
  ) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "You don't have space in your squad for these players!",
    });
  }

  const bidId = await createTransferBid(team.id, sellingTeamId, cost);
  if (cost > 0) {
    await updateCash(team.id, team.cash - cost);
  }
  await Promise.all(
    players.map(async (player) => {
      await createPlayerTransfer(
        bidId,
        player.id,
        player.teamId === team.id,
        false
      );
    })
  );
  await Promise.all(
    loanPlayers.map(async (player) => {
      await createPlayerTransfer(
        bidId,
        player.id,
        player.teamId === team.id,
        true
      );
    })
  );

  const sellingTeam = await getTeamById(sellingTeamId);
  await createGameLog(
    team.gameId,
    `${team.teamName} have put an offer in to ${sellingTeam.teamName}!`
  );
}
