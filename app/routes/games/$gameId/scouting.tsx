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
  scoutPlayer,
} from "~/engine/scouting";

type LoaderData = {
  team: Team;
  scoutedPlayers: GamePlayer[];
  hasScoutingRemaining: boolean;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const team = await getTeam(userId, params.gameId);
  const scoutedPlayers = await getScoutedPlayers(team);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({
    team,
    scoutedPlayers,
    hasScoutingRemaining: team.scoutingLevel > scoutedPlayers.length,
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  invariant(params.gameId, "gameId not found");
  const team = await getTeam(userId, params.gameId);

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

  return json({
    team,
    scoutedPlayers,
    hasScoutingRemaining: team.scoutingLevel > scoutedPlayers.length,
  });
};

export default function ScoutingPage() {
  const { team, scoutedPlayers, hasScoutingRemaining } =
    useLoaderData<LoaderData>();

  return (
    <div>
      <h2>
        {team.teamName} - {team.cash}M
      </h2>
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
          </li>
        ))}
      </ul>
    </div>
  );
}
