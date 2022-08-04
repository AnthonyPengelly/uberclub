import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { GamePlayer } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import type { ActionFunction } from "@remix-run/node";
import { hasTrainingRemaining, trainPlayer } from "~/engine/training";

type LoaderData = {
  team: Team;
  players: GamePlayer[];
  hasTrainingRemaining: boolean;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const team = await getTeam(userId, params.gameId);
  const players = await getTeamPlayers(team.id);
  const trainingRemaining = await hasTrainingRemaining(team);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ team, players, hasTrainingRemaining: trainingRemaining });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const formData = await request.formData();
  const team = await getTeam(userId, params.gameId);
  let playerId = formData.get("player-id") as string;
  await trainPlayer(playerId, team);

  const players = await getTeamPlayers(team.id);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ team, players });
};

export default function TrainingPage() {
  const { team, players, hasTrainingRemaining } = useLoaderData<LoaderData>();

  return (
    <div>
      <h2>{team.teamName}</h2>
      {!hasTrainingRemaining && <h3>Training complete</h3>}
      <ul>
        {players.map((x) => (
          <li key={x.id}>
            <img src={x.imageUrl} alt={x.name} width={40} height={40} />[
            {x.position}] {x.name}{" "}
            {[...Array(x.stars).keys()].map(() => "★").join("")}
            {[...Array(x.potential - x.stars).keys()].map(() => "☆").join("")}
            {x.potential - x.stars && hasTrainingRemaining ? (
              <Form method="post">
                <input type="hidden" name="player-id" value={x.id} />
                <button type="submit">Train</button>
              </Form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
