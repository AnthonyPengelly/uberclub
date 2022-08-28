import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
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

  return json<LoaderData>({ game, team, bids });
};

export default function OffersPage() {
  const { game, bids, team } = useLoaderData<LoaderData>();
  const canBuyOrSell = canBuyOrSellPlayer(game);
  const activeBids = bids.filter((x) => x.bid.status === Status.Pending);
  const completedBids = bids.filter((x) => x.bid.status !== Status.Pending);

  return (
    <>
      <div className="flow | quote">
        <p>Here you can view offers that you've sent and received.</p>
        {!canBuyOrSell && (
          <p>You can only buy/sell players during pre-season.</p>
        )}
      </div>
      <BidList
        bids={activeBids}
        heading="Active offers"
        gameId={game.id}
        teamId={team.id}
      />
      <BidList
        bids={completedBids}
        heading="Completed offers"
        gameId={game.id}
        teamId={team.id}
      />
    </>
  );
}

type BidListProps = {
  bids: BidSummary[];
  heading: string;
  gameId: string;
  teamId: string;
};

function BidList({ bids, heading, gameId, teamId }: BidListProps) {
  if (bids.length === 0) {
    return null;
  }
  return (
    <>
      <h3>{heading}</h3>
      {bids.map((x) => {
        const buyingTeamPlayers = x.bid.players.filter((y) => y.buyingTeam);
        const sellingTeamPlayers = x.bid.players.filter((y) => !y.buyingTeam);
        const outbound = x.buyingTeam.id === teamId;
        return (
          <div key={x.bid.id}>
            <div>
              {outbound ? "To" : "From"}{" "}
              <strong>
                {outbound
                  ? x.sellingTeam.managerName
                  : x.buyingTeam.managerName}
              </strong>
            </div>
            <div className="quote | flow" data-outbound={outbound}>
              <p>
                I will give you{" "}
                {buyingTeamPlayers.length !== 0 &&
                  buyingTeamPlayers
                    .map((y) => `${y.name}${y.loan ? " (loan)" : ""}`)
                    .join(", ")}{" "}
                {buyingTeamPlayers.length !== 0 && "and "}
                {x.bid.cost >= 0 ? `${x.bid.cost}M` : "0M"} in exchange for{" "}
                {sellingTeamPlayers.length !== 0 &&
                  sellingTeamPlayers
                    .map((y) => `${y.name}${y.loan ? " (loan)" : ""}`)
                    .join(", ")}{" "}
                {sellingTeamPlayers.length !== 0 && "and "}
                {x.bid.cost < 0 ? `${x.bid.cost * -1}M` : "0M"}
                {". "}
                <Link to={`/games/${gameId}/transfer-hub/${x.bid.id}`}>
                  «View»
                </Link>
              </p>
              <p>
                {x.bid.status === Status.Pending && "⏳ Pending"}
                {x.bid.status === Status.Accepted && "✅ Accepted"}
                {x.bid.status === Status.Rejected && "❌ Reject"}
                {x.bid.status === Status.Withdrawn && "❌ Withdrawn"}
              </p>
            </div>
          </div>
        );
      })}
    </>
  );
}
