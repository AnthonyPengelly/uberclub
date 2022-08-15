import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import LoadingForm from "~/components/loadingForm";
import PlayerDisplay from "~/components/playerDisplay";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import type { GamePlayer } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { sellPlayer } from "~/engine/finances";
import { canSellPlayer } from "~/engine/game";
import { getScoutPrice } from "~/engine/scouting";
import { MAX_SQUAD_SIZE } from "~/engine/team";
import { requireUserId } from "~/session.server";

type LoaderData = {
  team: Team;
  game: Game;
  players: GamePlayer[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);

  const team = await getTeam(userId, params.gameId);
  const players = await getTeamPlayers(team.id);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ game, team, players });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const team = await getTeam(userId, params.gameId);
  const game = await getGame(params.gameId);
  const formData = await request.formData();
  const playerId = formData.get("player-id") as string;
  invariant(playerId, "playerId not found");
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  if (!canSellPlayer(game)) {
    throw new Error("Cannot currently sell");
  }

  await sellPlayer(params.gameId, playerId, team);
  const players = await getTeamPlayers(team.id);

  return json({ game, team, players });
};

export default function SellPage() {
  const { game, team, players } = useLoaderData<LoaderData>();
  const canSell = canSellPlayer(game) && players.length > 11;

  return (
    <>
      <h1>{team.teamName} sales</h1>
      <div className="flow | quote">
        <p>
          Here you can sell players from your squad for a small profit. But be
          careful, once they are sold, there is no going back!
        </p>
        {!canSell && (
          <p>
            You can only sell players during pre-season, and as long as you have
            more than 11 players currently in your squad.
          </p>
        )}
      </div>
      <h2>{team.cash}M cash available</h2>
      <div>
        {players.length}/{MAX_SQUAD_SIZE} players in squad
      </div>
      <div className="players squad-list">
        {players.map((x) => (
          <PlayerDisplay key={x.id} player={x}>
            {canSell ? (
              <LoadingForm
                method="post"
                submitButtonText={`Sell: ${getScoutPrice(
                  x.stars,
                  x.potential
                )}M`}
                buttonClass="mini-button xs-button-text"
                onSubmit={(event) => {
                  if (!confirm(`Are you want to sell ${x.name}?`)) {
                    event.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="player-id" value={x.id} />
              </LoadingForm>
            ) : null}
          </PlayerDisplay>
        ))}
      </div>
    </>
  );
}
