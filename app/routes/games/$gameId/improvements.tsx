import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { ActionFunction } from "@remix-run/node";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { Stage } from "~/engine/game";
import {
  hasImprovementsRemaining,
  improve,
  improvementCost,
  Improvements,
} from "~/engine/improvements";

type LoaderData = {
  team: Team;
  game: Game;
  hasImprovementsRemaining: boolean;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const team = await getTeam(userId, params.gameId);
  const game = await getGame(params.gameId);
  const canInvest = await hasImprovementsRemaining(team);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({
    game,
    team,
    hasImprovementsRemaining: canInvest,
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  invariant(params.gameId, "gameId not found");
  const team = await getTeam(userId, params.gameId);
  const game = await getGame(params.gameId);

  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  await improve(team, parseInt(formData.get("improvement") as string, 10));
  const canInvest = await hasImprovementsRemaining(team);

  return json({
    game,
    team,
    hasImprovementsRemaining: canInvest,
  });
};

export default function ImprovementsPage() {
  const { game, team, hasImprovementsRemaining } = useLoaderData<LoaderData>();
  const trainingCost = improvementCost(team, Improvements.Training);
  const scoutingCost = improvementCost(team, Improvements.Scouting);
  const stadiumCost = improvementCost(team, Improvements.Stadium);

  return (
    <div>
      <h2>
        {team.teamName} - {team.cash}M
      </h2>
      {game.stage === Stage.Improvements && team.isReady && (
        <div>Waiting for other players</div>
      )}
      {game.stage === Stage.Improvements && !team.isReady && (
        <Form method="post" action={`/games/${game.id}/ready`}>
          <button type="submit">Complete improvements</button>
        </Form>
      )}
      <div>
        Current training level: {team.trainingLevel}
        {hasImprovementsRemaining &&
          trainingCost !== null &&
          team.cash > trainingCost && (
            <Form method="post">
              <input
                type="hidden"
                name="improvement"
                value={Improvements.Training}
              />
              <button type="submit">Improve for {trainingCost}M</button>
            </Form>
          )}
      </div>
      <div>
        Current scouting level: {team.scoutingLevel}
        {hasImprovementsRemaining &&
          scoutingCost !== null &&
          team.cash > scoutingCost && (
            <Form method="post">
              <input
                type="hidden"
                name="improvement"
                value={Improvements.Scouting}
              />
              <button type="submit">Improve for {scoutingCost}M</button>
            </Form>
          )}
      </div>
      <div>
        Current stadium level: {team.stadiumLevel}
        {hasImprovementsRemaining &&
          stadiumCost !== null &&
          team.cash > stadiumCost && (
            <Form method="post">
              <input
                type="hidden"
                name="improvement"
                value={Improvements.Stadium}
              />
              <button type="submit">Improve for {stadiumCost}M</button>
            </Form>
          )}
      </div>
    </div>
  );
}
