import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { GamePlayer } from "~/domain/players.server";
import type { ActionFunction } from "@remix-run/node";
import {
  buyScoutedPlayer,
  getScoutedPlayers,
  getScoutPrice,
  hasScoutingRemaining,
  scoutPlayer,
} from "~/engine/scouting";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { Stage } from "~/engine/game";

type LoaderData = {
  team: Team;
  game: Game;
  scoutedPlayers: GamePlayer[];
  hasScoutingRemaining: boolean;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const team = await getTeam(userId, params.gameId);
  const game = await getGame(params.gameId);
  const scoutedPlayers = await getScoutedPlayers(team);
  const canScout = await hasScoutingRemaining(team);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({
    game,
    team,
    scoutedPlayers,
    hasScoutingRemaining: canScout,
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
  const canScout = await hasScoutingRemaining(team);

  return json({
    game,
    team,
    scoutedPlayers,
    hasScoutingRemaining: canScout,
  });
};

export default function ScoutingPage() {
  const { game, team, scoutedPlayers, hasScoutingRemaining } =
    useLoaderData<LoaderData>();

  return (
    <div>
      <h2>
        {team.teamName}: Scouting Level {team.scoutingLevel}
      </h2>
      <p>({team.scoutingLevel} player(s) may be scouted)</p>
      <h3>{team.cash}M cash available</h3>
      {game.stage === Stage.Scouting && team.isReady && (
        <div>Waiting for other players</div>
      )}
      {game.stage === Stage.Scouting && !team.isReady && (
        <Form method="post" action={`/games/${game.id}/ready`}>
          <button type="submit">Complete scouting</button>
        </Form>
      )}
      {hasScoutingRemaining && (
        <Form method="post">
          <input type="hidden" name="action" value="scout-a-player" />
          <button type="submit">Scout A Player</button>
        </Form>
      )}
      <ul>
        {scoutedPlayers.map((x) => (
          <li key={x.id}>
            <img src={x.imageUrl} alt={x.name} width={40} height={40} />[
            {x.position}] {x.name}{" "}
            {[...Array(x.stars).keys()].map(() => "★").join("")}
            {[...Array(x.potential - x.stars).keys()]
              .map(() => "☆")
              .join("")}{" "}
            {getScoutPrice(x.overall, x.potential)}M
            {!x.teamId &&
              (team.cash < getScoutPrice(x.overall, x.potential) ? (
                <div>Not enough cash!</div>
              ) : (
                <Form method="post">
                  <input type="hidden" name="action" value="buy-player" />
                  <input type="hidden" name="player-id" value={x.id} />
                  <button type="submit">Buy</button>
                </Form>
              ))}
            {x.teamId && " - Signed!"}
          </li>
        ))}
      </ul>
    </div>
  );
}
