import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { GamePlayer } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import type { ActionFunction } from "@remix-run/node";
import {
  buyScoutedPlayer,
  canScout,
  getScoutedPlayers,
  getScoutingLogs,
  scoutPlayer,
} from "~/engine/scouting";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { Stage } from "~/engine/game";
import LoadingForm from "~/components/loadingForm";
import ScoutPlayer from "~/components/scoutPlayer";

type LoaderData = {
  team: Team;
  game: Game;
  scoutedPlayers: GamePlayer[];
  squadSize: number;
  scoutingLogs: { id: string }[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const team = await getTeam(userId, params.gameId);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  const squad = await getTeamPlayers(team.id);
  const game = await getGame(params.gameId);
  const scoutedPlayers = await getScoutedPlayers(team);
  const scoutingLogs = await getScoutingLogs(team);

  return json({
    game,
    team,
    scoutedPlayers,
    squadSize: squad.length,
    scoutingLogs,
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  invariant(params.gameId, "gameId not found");
  const team = await getTeam(userId, params.gameId);
  const game = await getGame(params.gameId);

  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  const squad = await getTeamPlayers(team.id);
  switch (formData.get("action")) {
    case "scout-a-player": {
      await scoutPlayer(team);
      break;
    }
    case "buy-player": {
      const playerId = formData.get("player-id") as string;
      invariant(playerId, "player-id not found");
      await buyScoutedPlayer(playerId, team);
      break;
    }
  }
  const scoutedPlayers = await getScoutedPlayers(team);
  const scoutingLogs = await getScoutingLogs(team);

  return json({
    game,
    team,
    scoutedPlayers,
    squadSize: squad.length,
    scoutingLogs,
  });
};

export default function ScoutingPage() {
  const { game, team, scoutedPlayers, squadSize, scoutingLogs } =
    useLoaderData<LoaderData>();
  const hasScoutingRemaining = canScout(game, scoutingLogs, team);
  return (
    <>
      <h1>{team.teamName} scouting</h1>
      <Link to={`/games/${game.id}/sell`}>«Sell players»</Link>
      <div className="flow | quote">
        <p>
          Welcome to the scouting hub. As a level {team.scoutingLevel} club, you
          are able to scout {team.scoutingLevel} player(s). Once you have a
          found a player, you may choose to sign them, or ignore them.
        </p>
        {!hasScoutingRemaining && (
          <p>
            You are not currently able to scout any more players, ensure you
            have decided the fate of any players here, and then complete the
            scouting phase.
          </p>
        )}
      </div>
      <h2>{team.cash}M cash available</h2>
      {game.stage === Stage.Scouting && team.isReady && (
        <div>Waiting for other players</div>
      )}
      {game.stage === Stage.Scouting && !team.isReady && (
        <>
          <LoadingForm
            method="post"
            action={`/games/${game.id}/ready`}
            submitButtonText="Complete scouting"
            onSubmit={(event) => {
              if (
                team.scoutingLevel - scoutingLogs.length !== 0 &&
                !confirm(
                  `You still have scouting remaining, are you sure you want to continue?`
                )
              ) {
                event.preventDefault();
              }
            }}
          />
          <p>
            {team.scoutingLevel - scoutingLogs.length}/{team.scoutingLevel}{" "}
            searches remaining
          </p>
        </>
      )}
      {hasScoutingRemaining && !team.isReady && (
        <LoadingForm
          method="post"
          submitButtonText="Scout a player"
          buttonClass="button-secondary"
        >
          <input type="hidden" name="action" value="scout-a-player" />
        </LoadingForm>
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
