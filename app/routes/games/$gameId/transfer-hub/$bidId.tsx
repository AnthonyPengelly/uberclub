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
import { getTeamPlayers } from "~/domain/players.server";
import { getPlayer } from "~/domain/players.server";
import type { Team } from "~/domain/team.server";
import { getTeamById } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import type { TransferBid } from "~/domain/transferBids.server";
import { getTransferBid } from "~/domain/transferBids.server";
import { overrideGameStageWithTeam } from "~/engine/game";
import { MAX_SQUAD_SIZE } from "~/engine/team";
import { Status } from "~/engine/transfers";
import { requireUserId } from "~/session.server";

type LoaderData = {
  team: Team;
  otherTeam: Team;
  game: Game;
  bid: TransferBid;
  players: GamePlayer[];
  ownPlayers: GamePlayer[];
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
    ownPlayers: await getTeamPlayers(team.id),
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  return redirect(`/games/${params.gameId}/transfer-hub`);
};

export default function TransferPage() {
  const { game, team, otherTeam, bid, players, ownPlayers } =
    useLoaderData<LoaderData>();

  // TODO canBuy
  //   const canBuy = canBuyOrSellPlayer(game);

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
  return (
    <>
      <h1>Transfer negotiations</h1>
      <h2>{team.cash}M cash available</h2>
      <div>
        {ownPlayers.length}/{MAX_SQUAD_SIZE} players in squad
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
      {bid.buyingTeamId === team.id && bid.status === Status.Pending && (
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
      {bid.sellingTeamId === team.id && bid.status === Status.Pending && (
        <div className="horizontal-flow | justify-centre">
          <LoadingForm
            method="post"
            action={`/games/${game.id}/transfer-hub/accept`}
            submitButtonText="Accept"
          >
            <input type="hidden" name="bid-id" value={bid.id} />
          </LoadingForm>
          <LoadingForm
            method="post"
            action={`/games/${game.id}/transfer-hub/counter`}
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
