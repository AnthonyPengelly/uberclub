import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import invariant from "tiny-invariant";
import { getTeam, updateStageOverride } from "~/domain/team.server";
import { Stage } from "~/engine/game";
import { requireUserId } from "~/session.server";

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const team = await getTeam(userId, params.gameId);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  const formData = await request.formData();
  const currentStage = formData.get("current-stage") as string;
  if (parseInt(currentStage, 10) === Stage.Training) {
    await updateStageOverride(team.id, Stage.Scouting);
    return redirect(`/games/${params.gameId}/scouting`);
  }
  if (parseInt(currentStage, 10) === Stage.Scouting) {
    await updateStageOverride(team.id, Stage.Improvements);
    return redirect(`/games/${params.gameId}/improvements`);
  }

  return redirect(`/games/${params.gameId}`);
};

export const loader: LoaderFunction = async ({ request, params }) => {
  return redirect(`/games/${params.gameId}`);
};
