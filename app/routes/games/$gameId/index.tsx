import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import type { Game, Team } from "~/domain/games.server";
import { getTeam } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";

type LoaderData = {
  game: Game;
  team: Team;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const game = await getGame(params.gameId);
  const team = await getTeam(userId, params.gameId);
  if (!game) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ game, team });
};

export default function GameDetailsPage() {
  const { team } = useLoaderData<LoaderData>();

  return (
    <div>
      <h2>{team.teamName}</h2>
      <Link to="team">Team</Link>
    </div>
  );
}
