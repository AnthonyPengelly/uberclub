import type { ActionFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import {
  getTeamPlayers,
  updatePlayerLineupPosition,
} from "~/domain/players.server";
import { getTeam } from "~/domain/team.server";
import { getPlayersWithAiPositions } from "~/engine/ai-team";
import { requireUserId } from "~/session.server";

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const team = await getTeam(userId, params.gameId);

  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  const players = await getTeamPlayers(team.id);
  const playersWithPositions = await getPlayersWithAiPositions(players);
  await Promise.all(
    playersWithPositions.map((x) =>
      updatePlayerLineupPosition(x.id, x.lineupPosition, x.captain)
    )
  );

  return redirect(`/games/${params.gameId}/team`);
};
