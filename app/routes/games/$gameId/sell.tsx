import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import { getGame } from "~/domain/games.server";
import { getTeam } from "~/domain/team.server";
import { sellPlayer } from "~/engine/finances";
import { canSellPlayer } from "~/engine/game";
import { requireUserId } from "~/session.server";

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const team = await getTeam(userId, params.gameId);
  const game = await getGame(params.gameId);
  const formData = await request.formData();
  const playerId = formData.get("player-id") as string;
  invariant(playerId, "playerId not found");
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  if (!canSellPlayer(game)) {
    throw new Error("Cannot currently sell");
  }

  await sellPlayer(params.gameId, playerId, team);

  return redirect(`/games/${params.gameId}/team`);
};
