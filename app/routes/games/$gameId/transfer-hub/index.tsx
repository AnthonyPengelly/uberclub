import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import LoadingForm from "~/components/loadingForm";
import PlayerDisplay from "~/components/playerDisplay";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import type { GamePlayer } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import { getPlayer } from "~/domain/players.server";
import type { Team } from "~/domain/team.server";
import { getTeamsInGame } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import type { TransferBid } from "~/domain/transferBids.server";
import { getTransferBidsForTeam } from "~/domain/transferBids.server";
import { canBuyOrSellPlayer, overrideGameStageWithTeam } from "~/engine/game";
import { getScoutPrice } from "~/engine/scouting";
import { MAX_SQUAD_SIZE } from "~/engine/team";
import { Status } from "~/engine/transfers";
import { requireUserId } from "~/session.server";

type BidSummary = {
  bid: TransferBid;
  player: GamePlayer;
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
      player: await getPlayer(x.playerGameStateId),
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
          <p>You can only buy/sell players during pre-season..</p>
        )}
      </div>
      <h2>{team.cash}M cash available</h2>
      <div>
        {players.length}/{MAX_SQUAD_SIZE} players in squad
      </div>
      <BidList
        bids={incomingBids}
        heading="Incoming offers"
        canBuyOrSell={canBuyOrSell}
        notEnoughPlayers={players.length === 11}
        gameId={game.id}
        teamId={team.id}
      />
      <BidList
        bids={outgoingBids}
        heading="Outgoing offers"
        canBuyOrSell={canBuyOrSell}
        notEnoughPlayers={players.length === 11}
        gameId={game.id}
        teamId={team.id}
      />
      <BidList
        bids={olderIncomingBids}
        heading="Previous incoming offers"
        canBuyOrSell={canBuyOrSell}
        notEnoughPlayers={players.length === 11}
        gameId={game.id}
        teamId={team.id}
      />
      <BidList
        bids={olderOutgoingBids}
        heading="Previous outgoing offers"
        canBuyOrSell={canBuyOrSell}
        notEnoughPlayers={players.length === 11}
        gameId={game.id}
        teamId={team.id}
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
};

function BidList({
  bids,
  heading,
  canBuyOrSell,
  notEnoughPlayers,
  gameId,
  teamId,
}: BidListProps) {
  if (bids.length === 0) {
    return null;
  }
  return (
    <>
      <h3>{heading}</h3>
      <div className="players squad-list | justify-left">
        {bids.map((x) => (
          <>
            <PlayerDisplay key={x.bid.id} player={x.player} />
            <div className="bid-info">
              <div className="flow">
                <div>
                  Offer: <strong>{x.bid.cost}M</strong>
                  <br />
                  <span className="small-text">
                    (Sell-on value:{" "}
                    {getScoutPrice(x.player.stars, x.player.potential)}M)
                  </span>
                </div>
                <div>
                  {x.buyingTeam.id === teamId ? "Made to" : "From"}{" "}
                  <strong>{x.buyingTeam.managerName}</strong>
                </div>
              </div>
              <BidForm
                canBuyOrSell={canBuyOrSell}
                notEnoughPlayers={notEnoughPlayers}
                bid={x}
                gameId={gameId}
                teamId={teamId}
              />
            </div>
          </>
        ))}
      </div>
    </>
  );
}

type BidFormProps = {
  canBuyOrSell: boolean;
  notEnoughPlayers: boolean;
  bid: BidSummary;
  gameId: string;
  teamId: string;
};

function BidForm({
  canBuyOrSell,
  notEnoughPlayers,
  bid,
  gameId,
  teamId,
}: BidFormProps) {
  if (bid.bid.status !== Status.Pending) {
    return (
      <div>
        {bid.bid.status === Status.Accepted ? "✅" : "❌"}{" "}
        {Status[bid.bid.status]}
      </div>
    );
  }
  if (!canBuyOrSell) {
    return <div>Can only use the transfer hub in pre-season</div>;
  }
  if (bid.buyingTeam.id === teamId) {
    return (
      <LoadingForm
        method="post"
        submitButtonText="Withdraw"
        buttonClass="mini-button button-secondary"
        action={`/games/${gameId}/transfer-hub/withdraw`}
      >
        <input type="hidden" name="bid-id" value={bid.bid.id} />
      </LoadingForm>
    );
  }
  if (notEnoughPlayers) {
    return <div>You don't have enough players to sell!</div>;
  }
  return (
    <div className="flow">
      <LoadingForm
        method="post"
        submitButtonText="Accept"
        buttonClass="mini-button"
        action={`/games/${gameId}/transfer-hub/accept`}
      >
        <input type="hidden" name="bid-id" value={bid.bid.id} />
      </LoadingForm>

      <LoadingForm
        method="post"
        submitButtonText="Reject"
        buttonClass="mini-button button-secondary"
        action={`/games/${gameId}/transfer-hub/reject`}
      >
        <input type="hidden" name="bid-id" value={bid.bid.id} />
      </LoadingForm>
    </div>
  );
}
