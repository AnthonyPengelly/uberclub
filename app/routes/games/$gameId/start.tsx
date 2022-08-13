import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import { getGame } from "~/domain/games.server";
import { getTeam } from "~/domain/team.server";
import { Stage, startGameEarly } from "~/engine/game";
import { requireUserId } from "~/session.server";

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const team = await getTeam(userId, params.gameId);
  const game = await getGame(params.gameId);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  if (game.stage !== Stage.NotStarted) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Game already started!",
    });
  }
  await startGameEarly(game);

  return redirect(`/games/${params.gameId}/`);
};

export const loader: LoaderFunction = async ({request, params}) => {
  return redirect(`/games/${params.gameId}`);
}
