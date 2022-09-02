import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { GamePlayer } from "~/domain/players.server";
import type { ActionFunction } from "@remix-run/node";
import { buyScoutedPlayer, getScoutedPlayers } from "~/engine/scouting";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { overrideGameStageWithTeam, Stage } from "~/engine/game";
import LoadingForm from "~/components/loadingForm";
import ScoutPlayer from "~/components/scoutPlayer";
import { getSquadSize } from "~/engine/players";
import { MAX_SQUAD_SIZE } from "~/engine/team";

type LoaderData = {
  team: Team;
  game: Game;
  scoutedPlayers: GamePlayer[];
  squadSize: number;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const team = await getTeam(userId, params.gameId);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  const game = await getGame(params.gameId);
  overrideGameStageWithTeam(game, team);
  const scoutedPlayers = await getScoutedPlayers(team);

  return json({
    game,
    team,
    scoutedPlayers,
    squadSize: (await getSquadSize(team)).committedSize,
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  invariant(params.gameId, "gameId not found");
  const team = await getTeam(userId, params.gameId);
  const game = await getGame(params.gameId);
  overrideGameStageWithTeam(game, team);

  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  const playerId = formData.get("player-id") as string;
  invariant(playerId, "player-id not found");
  await buyScoutedPlayer(playerId, team);

  const scoutedPlayers = await getScoutedPlayers(team);

  return json({
    game,
    team,
    scoutedPlayers,
    squadSize: (await getSquadSize(team)).committedSize,
  });
};

export default function ScoutingPage() {
  const { game, team, scoutedPlayers, squadSize } = useLoaderData<LoaderData>();
  return (
    <>
      <h1>{team.teamName} scouting</h1>
      <Link to={`/games/${game.id}/transfer-hub/sell`}>«Sell players»</Link>
      <div className="flow | quote">
        <p>
          Welcome to the scouting hub. As a level {team.scoutingLevel} club, you
          are able to scout {team.scoutingLevel} player(s). Below you will find
          the players that your scouts have picked out. You may choose to sign
          them, or ignore them.
        </p>
      </div>
      <h2>{team.cash}M cash available</h2>
      <div>
        {squadSize}/{MAX_SQUAD_SIZE} players committed (incl. pending transfers)
      </div>
      {game.stage === Stage.Scouting && team.isReady && (
        <div>Waiting for other players</div>
      )}
      {game.stage === Stage.Scouting && !team.isReady && (
        <>
          <LoadingForm
            method="post"
            action={`/games/${game.id}/stage-override`}
            submitButtonText="Complete scouting"
          >
            <input type="hidden" name="current-stage" value={Stage.Scouting} />
          </LoadingForm>
        </>
      )}
      <div className="players squad-list | justify-left">
        {scoutedPlayers.map((x) => (
          <ScoutPlayer
            key={x.id}
            player={x}
            team={team}
            squadSize={squadSize}
            canBuy={game.stage === Stage.Scouting && !team.isReady}
          />
        ))}
      </div>
    </>
  );
}
