import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import { getTeam } from "~/domain/team.server";
import { markTeamAsReady } from "~/engine/game";
import { requireUserId } from "~/session.server";

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const team = await getTeam(userId, params.gameId);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  await markTeamAsReady(params.gameId, team);

  return redirect(`/games/${params.gameId}`);
};

export const loader: LoaderFunction = async ({request, params}) => {
  return redirect(`/games/${params.gameId}`);
}