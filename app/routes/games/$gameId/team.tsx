import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { GamePlayer } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { addPlayerToLineup, removePlayerFromLineup } from "~/engine/lineup";

type LoaderData = {
  team: Team;
  players: GamePlayer[];
  game: Game;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const team = await getTeam(userId, params.gameId);
  const players = await getTeamPlayers(team.id);
  const game = await getGame(params.gameId);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ team, players, game });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);
  const formData = await request.formData();
  const team = await getTeam(userId, params.gameId);
  const playerId = formData.get("player-id") as string;
  const existingPlayerId = formData.get("existing-player-id") as string;
  const position = parseInt(formData.get("position") as string, 10);
  invariant(playerId, "playerId not found");
  invariant(position, "position not found");

  if (playerId === "null") {
    await removePlayerFromLineup(existingPlayerId);
  } else {
    await addPlayerToLineup(playerId, position, existingPlayerId);
  }

  const players = await getTeamPlayers(team.id);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ team, players, game });
};

export default function TeamPage() {
  const { team, players } = useLoaderData<LoaderData>();

  return (
    <div>
      <h2>{team.teamName}</h2>
      <p>Team validity TODO</p>
      <h3>GKP</h3>
      <Position players={players} position={1} />
      <h3>DEF</h3>
      {[...Array(5).keys()].map((x) => (
        <Position key={`def-${x}`} players={players} position={x + 2} />
      ))}
      <h3>MID</h3>
      {[...Array(5).keys()].map((x) => (
        <Position key={`mid-${x}`} players={players} position={x + 7} />
      ))}
      <h3>FWD</h3>
      {[...Array(4).keys()].map((x) => (
        <Position key={`fwd-${x}`} players={players} position={x + 12} />
      ))}
      <h3>Reserves</h3>
      <ul>
        {players
          .filter((x) => x.lineupPosition === null)
          .map((x) => (
            <li key={x.id}>
              <Player player={x} />
            </li>
          ))}
      </ul>
    </div>
  );
}

function Position({
  position,
  players,
}: {
  position: number;
  players: GamePlayer[];
}) {
  const existingPlayer = players.find((x) => x.lineupPosition === position);
  return (
    <div>
      {existingPlayer ? (
        <Player player={existingPlayer} />
      ) : (
        <div>No player selected</div>
      )}
      <Form method="post">
        <input
          type="hidden"
          name="existing-player-id"
          value={existingPlayer?.id}
        />
        <input type="hidden" name="position" value={position} />
        <select name="player-id" defaultValue={existingPlayer?.id}>
          <option value="null">None</option>
          {players.map((x) => (
            <option key={x.id} value={x.id}>
              [{x.position}] {x.name}
            </option>
          ))}
        </select>
        <button type="submit">Save</button>
      </Form>
    </div>
  );
}

function Player({ player }: { player: GamePlayer }) {
  return (
    <>
      <img src={player.imageUrl} alt={player.name} width={40} height={40} />[
      {player.position}] {player.name}{" "}
      {[...Array(player.overall).keys()].map(() => "★").join("")}
      {[...Array(player.potential - player.overall).keys()]
        .map(() => "☆")
        .join("")}
    </>
  );
}
