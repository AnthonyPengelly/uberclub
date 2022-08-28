import type { LoaderFunction } from "@remix-run/node";
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
import { canBuyOrSellPlayer, overrideGameStageWithTeam } from "~/engine/game";
import { LOAN_GAMES_REQUIRED_TO_IMPROVE } from "~/engine/loans";
import { usePlayerFilters } from "~/hooks/usePlayerFilters";
import { requireUserId } from "~/session.server";

type LoaderData = {
  team: Team;
  game: Game;
  players: (GamePlayer & { managerName: string })[];
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

  return json<LoaderData>({
    game,
    team,
    players: await otherTeamPlayers(team),
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

export default function PlayersPage() {
  const { game, players } = useLoaderData<LoaderData>();
  const { filteredPlayers, filters } = usePlayerFilters(players);
  const canBuy = canBuyOrSellPlayer(game);

  return (
    <>
      <div className="flow | quote">
        <p>
          Here you can enter negotiations for players on opponent teams. You
          must put up the cash up-front and have space in your squad. However,
          you can cancel the bid to have it refunded.
        </p>
        <p>
          You can also loan players! Loaned players will return at the end of
          the season and will have gained one star from the experience if they
          played in at least {LOAN_GAMES_REQUIRED_TO_IMPROVE} games (and they
          haven't already reached their potential).
        </p>
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
              <NegotiateForm canBuy={canBuy} player={x} gameId={game.id} />
            </div>
          </>
        ))}
        {filteredPlayers.length === 0 && <div>No players found</div>}
      </div>
    </>
  );
}

type NegotiateFormProps = {
  canBuy: boolean;
  player: GamePlayer;
  gameId: string;
};

function NegotiateForm({ canBuy, player, gameId }: NegotiateFormProps) {
  if (!canBuy) {
    return <div>Can only put in offers in pre-season</div>;
  }
  if (player.loan) {
    return <div>Player currently on loan</div>;
  }
  return (
    <LoadingForm
      method="get"
      action={`/games/${gameId}/transfer-hub/new`}
      submitButtonText="Negotiate"
      buttonClass="mini-button"
    >
      <input type="hidden" name="player-id" value={player.id} />
      <input type="hidden" name="selling-team-id" value={player.teamId} />
    </LoadingForm>
  );
}
