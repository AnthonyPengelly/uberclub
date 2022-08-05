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
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { Stage } from "~/engine/game";

type LoaderData = {
  team: Team;
  game: Game;
  players: GamePlayer[];
  hasTrainingRemaining: boolean;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);

  const team = await getTeam(userId, params.gameId);
  const players = await getTeamPlayers(team.id);
  const trainingRemaining = await hasTrainingRemaining(team);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ game, team, players, hasTrainingRemaining: trainingRemaining });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);
  const formData = await request.formData();
  const team = await getTeam(userId, params.gameId);
  let playerId = formData.get("player-id") as string;
  await trainPlayer(playerId, team);

  const players = await getTeamPlayers(team.id);
  const trainingRemaining = await hasTrainingRemaining(team);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ game, team, players, hasTrainingRemaining: trainingRemaining });
};

export default function TrainingPage() {
  const { game, team, players, hasTrainingRemaining } =
    useLoaderData<LoaderData>();

  return (
    <div>
      <h2>
        {team.teamName}: Training Level {team.trainingLevel}
      </h2>
      <p>
        ({team.trainingLevel} player(s) may be improved by up to{" "}
        {team.trainingLevel} stars)
      </p>
      {!hasTrainingRemaining && <h3>No Training Available</h3>}
      {game.stage === Stage.Training && team.isReady && (
        <div>Waiting for other players</div>
      )}
      {game.stage === Stage.Training && !team.isReady && (
        <Form method="post" action={`/games/${game.id}/ready`}>
          <button type="submit">Complete training</button>
        </Form>
      )}
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
