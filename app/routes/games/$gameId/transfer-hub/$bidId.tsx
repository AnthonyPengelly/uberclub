import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import LoadingForm from "~/components/loadingForm";
import PlayerDisplay from "~/components/playerDisplay";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import type { GamePlayer } from "~/domain/players.server";
import { getPlayer } from "~/domain/players.server";
import type { Team } from "~/domain/team.server";
import { getTeamById } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import type { TransferBid } from "~/domain/transferBids.server";
import { getTransferBid } from "~/domain/transferBids.server";
import { canBuyOrSellPlayer, overrideGameStageWithTeam } from "~/engine/game";
import { getSquadSize } from "~/engine/players";
import { MAX_SQUAD_SIZE } from "~/engine/team";
import { Status } from "~/engine/transfers";
import { requireUserId } from "~/session.server";

type LoaderData = {
  team: Team;
  otherTeam: Team;
  game: Game;
  bid: TransferBid;
  players: GamePlayer[];
  squadSize: { squadSize: number; committedSize: number };
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

  invariant(params.bidId, "bidId not found");
  const bid = await getTransferBid(params.bidId);
  if (!bid) {
    throw new Response("Not Found", { status: 404 });
  }

  const otherTeam = await getTeamById(
    team.id === bid.buyingTeamId ? bid.sellingTeamId : bid.buyingTeamId
  );

  const players = await Promise.all(
    bid.players.map((x) => getPlayer(x.playerId))
  );

  return json<LoaderData>({
    game,
    team,
    otherTeam,
    bid,
    players,
    squadSize: await getSquadSize(team),
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  return redirect(`/games/${params.gameId}/transfer-hub`);
};

export default function TransferPage() {
  const { game, team, otherTeam, bid, players, squadSize } =
    useLoaderData<LoaderData>();

  const canBuy = canBuyOrSellPlayer(game);

  const buyingTeamPlayersIncluded = bid.players
    .filter((x) => x.buyingTeam && !x.loan)
    .map((x) => players.find((y) => y.id === x.playerId) as GamePlayer);
  const buyingTeamLoanPlayersIncluded = bid.players
    .filter((x) => x.buyingTeam && x.loan)
    .map((x) => players.find((y) => y.id === x.playerId) as GamePlayer);
  const sellingTeamPlayersIncluded = bid.players
    .filter((x) => !x.buyingTeam && !x.loan)
    .map((x) => players.find((y) => y.id === x.playerId) as GamePlayer);
  const sellingTeamLoanPlayersIncluded = bid.players
    .filter((x) => !x.buyingTeam && x.loan)
    .map((x) => players.find((y) => y.id === x.playerId) as GamePlayer);

  const playerBalance =
    buyingTeamPlayersIncluded.length +
    buyingTeamLoanPlayersIncluded.length -
    (sellingTeamPlayersIncluded.length + sellingTeamLoanPlayersIncluded.length);
  const tooFewPlayers =
    playerBalance < 0 && squadSize.squadSize + playerBalance < 11;
  const tooManyPlayers =
    playerBalance > 0 &&
    squadSize.committedSize + playerBalance > MAX_SQUAD_SIZE;
  const canAfford = team.cash > bid.cost * -1;
  return (
    <>
      <h1>Transfer negotiations</h1>
      <h2>{team.cash}M cash available</h2>
      <div>
        {squadSize.committedSize}/{MAX_SQUAD_SIZE} players in squad (incl.
        pending transfers and deadline day bids)
      </div>
      {bid.cost > 0 && (
        <div className="notice | centre">💵💵➡ {bid.cost}M ➡💵💵</div>
      )}
      {bid.cost < 0 && (
        <div className="notice | centre">💵💵⬅ {bid.cost * -1}M ⬅💵💵</div>
      )}
      {bid.cost === 0 && <div className="notice | centre">0M</div>}
      <div className="split | background-grey">
        <div className="flow | switch-icon">
          <h3>
            {bid.buyingTeamId === team.id ? team.teamName : otherTeam.teamName}
          </h3>
          {buyingTeamPlayersIncluded.length !== 0 && (
            <>
              <h4>Players</h4>
              <div className="players players-width-2 squad-list | justify-left">
                {buyingTeamPlayersIncluded.map((x) => (
                  <PlayerDisplay player={x} key={x.id} />
                ))}
              </div>
            </>
          )}
          {buyingTeamLoanPlayersIncluded.length !== 0 && (
            <>
              <h4>Loan players</h4>
              <div className="players players-width-2 squad-list | justify-left">
                {buyingTeamLoanPlayersIncluded.map((x) => (
                  <PlayerDisplay player={x} key={x.id} />
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flow">
          <h3>
            {bid.sellingTeamId === team.id ? team.teamName : otherTeam.teamName}
          </h3>
          {sellingTeamPlayersIncluded.length !== 0 && (
            <>
              <h4>Players</h4>
              <div className="players players-width-2 squad-list | justify-left">
                {sellingTeamPlayersIncluded.map((x) => (
                  <PlayerDisplay player={x} key={x.id} />
                ))}
              </div>
            </>
          )}
          {sellingTeamLoanPlayersIncluded.length !== 0 && (
            <>
              <h4>Loan players</h4>
              <div className="players players-width-2 squad-list | justify-left">
                {sellingTeamLoanPlayersIncluded.map((x) => (
                  <PlayerDisplay player={x} key={x.id} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {!canBuy && (
        <div className="centre">
          Can use the transfer hub during the pre-season
        </div>
      )}
      {bid.buyingTeamId === team.id && bid.status === Status.Pending && canBuy && (
        <LoadingForm
          method="post"
          action={`/games/${game.id}/transfer-hub/withdraw`}
          submitButtonText="Withdraw"
          className="centre"
          buttonClass="button-secondary"
        >
          <input type="hidden" name="bid-id" value={bid.id} />
        </LoadingForm>
      )}
      {bid.sellingTeamId === team.id &&
        bid.status === Status.Pending &&
        canBuy && (
          <>
            <div className="horizontal-flow | justify-centre">
              {!tooFewPlayers && !tooManyPlayers && canAfford && (
                <LoadingForm
                  method="post"
                  action={`/games/${game.id}/transfer-hub/accept`}
                  submitButtonText="Accept"
                >
                  <input type="hidden" name="bid-id" value={bid.id} />
                </LoadingForm>
              )}
              <LoadingForm
                method="post"
                action={`/games/${game.id}/transfer-hub/counter`}
                buttonClass="button-secondary"
                submitButtonText="Counter offer"
              >
                <input type="hidden" name="bid-id" value={bid.id} />
              </LoadingForm>
              <LoadingForm
                method="post"
                action={`/games/${game.id}/transfer-hub/reject`}
                buttonClass="button-secondary"
                submitButtonText="Reject"
              >
                <input type="hidden" name="bid-id" value={bid.id} />
              </LoadingForm>
            </div>

            {tooFewPlayers && (
              <div className="centre">
                Can't accept - this would leave you with less than 11 players!
              </div>
            )}
            {tooManyPlayers && (
              <div className="centre">
                Can't accept - you don't have space in your squad! Sell first or
                withdraw other transfer bids
              </div>
            )}
            {!canAfford && (
              <div className="centre">
                Can't accept - you don't have enough cash!
              </div>
            )}
          </>
        )}
      {bid.status === Status.Accepted && (
        <div className="centre">✅ Accepted</div>
      )}
      {bid.status === Status.Rejected && (
        <div className="centre">❌ Rejected</div>
      )}
      {bid.status === Status.Withdrawn && (
        <div className="centre">❌ Withdrawn</div>
      )}
    </>
  );
}
