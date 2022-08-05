import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import type { Game } from "~/domain/games.server";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { getGame } from "~/domain/games.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { GameLog } from "~/domain/logs.server";
import { getGameLogs } from "~/domain/logs.server";

type LoaderData = {
  game: Game;
  team: Team;
  logs: GameLog[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const game = await getGame(params.gameId);
  if (!game) {
    throw new Response("Not Found", { status: 404 });
  }
  const team = await getTeam(userId, params.gameId);
  const logs = await getGameLogs(params.gameId);

  return json({ game, team, logs });
};

export default function GameDetailsPage() {
  const { team, logs } = useLoaderData<LoaderData>();

  return (
    <div>
      <h2>Welcome, {team.managerName}</h2>
      <Link to="team">Team</Link>
      <ul>
        {logs.map((x) => (
          <li key={x.id}>
            {x.createdAt} - {x.event}
          </li>
        ))}
      </ul>
    </div>
  );
}
