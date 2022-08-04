import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Outlet, useLoaderData } from "@remix-run/react";
import type { Game, Team } from "~/domain/games.server";
import { getTeam } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import { isOpenForPlayers, joinGame } from "~/engine/game";

type LoaderData = {
  game: Game;
  team: Team | null;
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

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  let teamName = formData.get("team-name") as string;
  let managerName = formData.get("manager-name") as string;
  invariant(params.gameId, "gameId not found");
  invariant(teamName, "team name not found");
  invariant(managerName, "manager name not found");

  await joinGame({ userId, gameId: params.gameId, teamName, managerName });

  return redirect(`/games/${params.gameId}`);
};

export default function GamePage() {
  const { game, team } = useLoaderData<LoaderData>();

  return (
    <div>
      <h1>{game.name}</h1>
      {team && <Outlet />}
      {!team &&
        (isOpenForPlayers(game) ? (
          <Form method="post">
            <div>
              <label htmlFor="team-name">Team Name</label>
              <input type="text" name="team-name" id="team-name" />
            </div>
            <div>
              <label htmlFor="manager-name">Manager Name</label>
              <input type="text" name="manager-name" id="manager-name" />
            </div>
            <button type="submit">Join</button>
          </Form>
        ) : (
          <div>Sorry, this game is not open for registration</div>
        ))}
    </div>
  );
}
