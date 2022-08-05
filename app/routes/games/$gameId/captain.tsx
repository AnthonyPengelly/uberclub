import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import { getTeam } from "~/domain/team.server";
import { updateCaptain } from "~/engine/lineup";
import { requireUserId } from "~/session.server";

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const formData = await request.formData();
  const team = await getTeam(userId, params.gameId);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  const playerId = formData.get("player-id") as string;
  const existingPlayerId = formData.get("existing-player-id") as string;
  await updateCaptain(playerId, existingPlayerId);

  return redirect(`/games/${params.gameId}/team`);
};
