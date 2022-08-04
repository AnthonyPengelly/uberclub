import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { GamePlayer } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";

type LoaderData = {
  team: Team;
  players: GamePlayer[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const team = await getTeam(userId, params.gameId);
  const players = await getTeamPlayers(team.id);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ team, players });
};

export default function TeamPage() {
  const { team, players } = useLoaderData<LoaderData>();

  return (
    <div>
      <h2>{team.teamName}</h2>
      <ul>
        {players.map((x) => (
          <li key={x.id}>
            <img src={x.imageUrl} alt={x.name} width={40} height={40} />[
            {x.position}] {x.name}{" "}
            {[...Array(x.overall).keys()].map(() => "★").join("")}
            {[...Array(x.potential - x.overall).keys()].map(() => "☆").join("")}
          </li>
        ))}
      </ul>
    </div>
  );
}
