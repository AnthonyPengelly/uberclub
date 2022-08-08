import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import invariant from "tiny-invariant";
import { getGame } from "~/domain/games.server";

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);
  if (!game) {
    throw new Response("Not Found", { status: 404 });
  }
  return json({ stage: game.stage });
};
