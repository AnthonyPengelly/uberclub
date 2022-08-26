import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import { FiltersWidget } from "~/components/filtersWidget";
import LoadingForm from "~/components/loadingForm";
import PlayerDisplay from "~/components/playerDisplay";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import type { GamePlayer } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import type { Team } from "~/domain/team.server";
import { getTeamsInGame } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import type { TransferBid } from "~/domain/transferBids.server";
import { getTransferBidsForTeam } from "~/domain/transferBids.server";
import { minBidPrice } from "~/engine/deadlineDay";
import { canBuyOrSellPlayer, overrideGameStageWithTeam } from "~/engine/game";
import { MAX_SQUAD_SIZE } from "~/engine/team";
import { makeBidForPlayer, Status } from "~/engine/transfers";
import { usePlayerFilters } from "~/hooks/usePlayerFilters";
import { requireUserId } from "~/session.server";

type LoaderData = {
  team: Team;
  game: Game;
  players: (GamePlayer & { managerName: string })[];
  ownPlayers: GamePlayer[];
  bids: TransferBid[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);
  const team = await getTeam(userId, params.gameId);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  overrideGameStageWithTeam(game, team);

  const ownPlayers = await getTeamPlayers(team.id);

  const bids = (await getTransferBidsForTeam(team.id)).filter(
    (x) => x.buyingTeamId === team.id && x.status === Status.Pending
  );

  return json<LoaderData>({
    game,
    team,
    players: await otherTeamPlayers(team),
    bids,
    ownPlayers,
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const team = await getTeam(userId, params.gameId);
  const game = await getGame(params.gameId);
  overrideGameStageWithTeam(game, team);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  const formData = await request.formData();
  const playerId = formData.get("player-id") as string;
  invariant(playerId, "playerId not found");

  const bids = (await getTransferBidsForTeam(team.id)).filter(
    (x) => x.buyingTeamId === team.id && x.status === Status.Pending
  );
  await makeBidForPlayer(
    team,
    playerId,
    parseInt(formData.get("cost") as string, 10),
    bids,
    game,
    !!formData.get("loan")
  );

  const ownPlayers = await getTeamPlayers(team.id);
  return json<LoaderData>({
    game,
    team,
    players: await otherTeamPlayers(team),
    bids,
    ownPlayers,
  });
};

async function otherTeamPlayers(team: Team) {
  const otherTeams = (await getTeamsInGame(team.gameId)).filter(
    (x) => x.id !== team.id
  );
  return (
    await Promise.all(
      otherTeams.map(async (x) =>
        (
          await getTeamPlayers(x.id)
        ).map((y) => ({
          managerName: x.managerName,
          ...y,
          lineupPosition: undefined,
          captain: false,
        }))
      )
    )
  )
    .flat()
    .sort((a, b) => b.potential - a.potential)
    .sort((a, b) => b.stars - a.stars);
}

export default function BuyPage() {
  const { game, team, players, bids, ownPlayers } = useLoaderData<LoaderData>();
  const { filteredPlayers, filters } = usePlayerFilters(players);
  const canBuy = canBuyOrSellPlayer(game);

  return (
    <>
      <div className="flow | quote">
        <p>
          Here you can put in offers for players on opponent teams. You must put
          up the cash up-front and have space in your squad. However, you can
          cancel the bid to have it refunded.
        </p>
        <p>
          You can also loan players! Loaned players will return at the end of
          the season and will have gained one star from the experience (if
          possible).
        </p>
        {!canBuy && <p>You can only buy players during pre-season.</p>}
      </div>
      <h2>{team.cash}M cash available</h2>
      <div>
        {ownPlayers.length}/{MAX_SQUAD_SIZE} players in squad
      </div>
      <FiltersWidget players={players} filters={filters} />
      <div className="players squad-list | justify-left">
        {filteredPlayers.map((x) => (
          <>
            <PlayerDisplay key={x.id} player={x} />
            <div className="bid-info">
              <div>
                Owner: <strong>{x.managerName}</strong>
              </div>
              <BuyForm
                canBuy={canBuy}
                tooManyPlayers={
                  ownPlayers.length + bids.length === MAX_SQUAD_SIZE
                }
                bids={bids}
                maxBid={team.cash}
                player={x}
                gameId={game.id}
              />
            </div>
          </>
        ))}
        {filteredPlayers.length === 0 && <div>No players found</div>}
      </div>
    </>
  );
}

type BuyFormProps = {
  canBuy: boolean;
  tooManyPlayers: boolean;
  maxBid: number;
  player: GamePlayer;
  bids: TransferBid[];
  gameId: string;
};

function BuyForm({
  canBuy,
  tooManyPlayers,
  maxBid,
  player,
  bids,
  gameId,
}: BuyFormProps) {
  if (!canBuy) {
    return <div>Can only put in offers in pre-season</div>;
  }
  if (tooManyPlayers) {
    return <div>Your squad is full!</div>;
  }
  const existingBid = bids.find(
    (x) => x.playerGameStateId === player.id && x.status === Status.Pending
  );
  if (existingBid) {
    return (
      <LoadingForm
        method="post"
        submitButtonText="Withdraw"
        buttonClass="mini-button button-secondary"
        action={`/games/${gameId}/transfer-hub/withdraw`}
      >
        <input type="hidden" name="bid-id" value={existingBid.id} />
        <div>Current bid: {existingBid.cost}M</div>
      </LoadingForm>
    );
  }
  return (
    <LoadingForm
      method="post"
      submitButtonText="Offer"
      buttonClass="mini-button"
    >
      <input type="hidden" name="player-id" value={player.id} />
      <input type="checkbox" name="loan" />
      <label htmlFor="loan">Loan?</label>
      <input
        className="mini-input"
        type="number"
        name="cost"
        min={0}
        max={maxBid}
        placeholder={minBidPrice(player).toString()}
        required
      />
    </LoadingForm>
  );
}
