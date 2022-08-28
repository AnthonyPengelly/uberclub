import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import type { GamePlayer } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import type { Team } from "~/domain/team.server";
import { getTeamsInGame } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import type { TransferBid } from "~/domain/transferBids.server";
import { getTransferBidsForTeam } from "~/domain/transferBids.server";
import { canBuyOrSellPlayer, overrideGameStageWithTeam } from "~/engine/game";
import { Status } from "~/engine/transfers";
import { requireUserId } from "~/session.server";

type BidSummary = {
  bid: TransferBid;
  buyingTeam: Team;
  sellingTeam: Team;
};

type LoaderData = {
  team: Team;
  game: Game;
  bids: BidSummary[];
  players: GamePlayer[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);
  const team = await getTeam(userId, params.gameId);
  overrideGameStageWithTeam(game, team);

  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  const allTeams = await getTeamsInGame(game.id);
  const bids = await Promise.all(
    (
      await getTransferBidsForTeam(team.id)
    ).map(async (x) => ({
      bid: x,
      buyingTeam: allTeams.find((y) => y.id === x.buyingTeamId) as Team,
      sellingTeam: allTeams.find((y) => y.id === x.sellingTeamId) as Team,
    }))
  );

  const players = await getTeamPlayers(team.id);
  return json<LoaderData>({ game, team, bids, players });
};

export default function OffersPage() {
  const { game, team, bids, players } = useLoaderData<LoaderData>();
  const canBuyOrSell = canBuyOrSellPlayer(game);
  const incomingBids = bids.filter(
    (x) => x.sellingTeam.id === team.id && x.bid.status === Status.Pending
  );
  const outgoingBids = bids.filter(
    (x) => x.buyingTeam.id === team.id && x.bid.status === Status.Pending
  );
  const olderIncomingBids = bids.filter(
    (x) => x.sellingTeam.id === team.id && x.bid.status !== Status.Pending
  );
  const olderOutgoingBids = bids.filter(
    (x) => x.buyingTeam.id === team.id && x.bid.status !== Status.Pending
  );

  return (
    <>
      <div className="flow | quote">
        <p>Here you can view offers that you've sent and received.</p>
        {!canBuyOrSell && (
          <p>You can only buy/sell players during pre-season.</p>
        )}
      </div>
      <BidList
        bids={incomingBids}
        heading="Incoming offers"
        canBuyOrSell={canBuyOrSell}
        notEnoughPlayers={players.length === 11}
        gameId={game.id}
        teamId={team.id}
        outbound={false}
      />
      <BidList
        bids={outgoingBids}
        heading="Outgoing offers"
        canBuyOrSell={canBuyOrSell}
        notEnoughPlayers={players.length === 11}
        gameId={game.id}
        teamId={team.id}
        outbound
      />
      <BidList
        bids={olderIncomingBids}
        heading="Previous incoming offers"
        canBuyOrSell={canBuyOrSell}
        notEnoughPlayers={players.length === 11}
        gameId={game.id}
        teamId={team.id}
        outbound={false}
      />
      <BidList
        bids={olderOutgoingBids}
        heading="Previous outgoing offers"
        canBuyOrSell={canBuyOrSell}
        notEnoughPlayers={players.length === 11}
        gameId={game.id}
        teamId={team.id}
        outbound
      />
    </>
  );
}

type BidListProps = {
  bids: BidSummary[];
  heading: string;
  canBuyOrSell: boolean;
  notEnoughPlayers: boolean;
  gameId: string;
  teamId: string;
  outbound: boolean;
};

function BidList({ bids, heading, gameId, teamId, outbound }: BidListProps) {
  if (bids.length === 0) {
    return null;
  }
  return (
    <>
      <h3>{heading}</h3>
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th>{outbound ? "To" : "From"}</th>
            <th>Players</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {bids.map((x) => (
            <tr key={x.bid.id}>
              <td>
                {x.bid.status === Status.Pending && "⏳"}
                {(x.bid.status === Status.Rejected ||
                  x.bid.status === Status.Withdrawn) &&
                  "❌"}
                {x.bid.status === Status.Accepted && "✅"}
              </td>
              <td>
                {outbound
                  ? x.sellingTeam.managerName
                  : x.buyingTeam.managerName}
              </td>
              <td>{x.bid.players.map((y) => y.name).join(", ")}</td>
              <td>
                <Link to={`/games/${gameId}/transfer-hub/${x.bid.id}`}>
                  «View»
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
