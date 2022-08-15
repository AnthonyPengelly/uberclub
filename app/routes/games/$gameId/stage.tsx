import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import invariant from "tiny-invariant";
import { getGame } from "~/domain/games.server";
import { getTeam } from "~/domain/team.server";
import { overrideGameStageWithTeam } from "~/engine/game";
import { requireUserId } from "~/session.server";

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);
  const team = await getTeam(userId, params.gameId);
  if (!game || !team) {
    throw new Response("Not Found", { status: 404 });
  }
  overrideGameStageWithTeam(game, team);
  return json({ stage: game.stage });
};
