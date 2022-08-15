import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { ActionFunction } from "@remix-run/node";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { overrideGameStageWithTeam, Stage } from "~/engine/game";
import {
  hasImprovementsRemaining,
  improve,
  improvementCost,
  Improvements,
} from "~/engine/improvements";
import LoadingForm from "~/components/loadingForm";

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
  overrideGameStageWithTeam(game, team);
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
  overrideGameStageWithTeam(game, team);

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
    <>
      <h1>{team.teamName} investments</h1>
      <div className="flow | quote">
        <p>
          Welcome to the investment hub. Here you can choose any two investments
          to improve your club for future seasons.
        </p>
        <p>
          At the end of each season, you get cash from the stadium income based
          on how well you did that season. The thresholds are at 40, 60 and 80
          points. Improving your stadium multiplies this effect.
        </p>
        {game.stage === Stage.Improvements && team.isReady && (
          <p>
            You don't currently have any investments to make. Make sure to come
            back during the improvement phase of pre season.
          </p>
        )}
        {game.stage === Stage.Improvements &&
          !team.isReady &&
          !hasImprovementsRemaining && (
            <p>
              You've finished all of your improvements. Once you are ready,
              select the button below to complete this phase.
            </p>
          )}
      </div>
      <h2>{team.cash}M cash available</h2>
      {game.stage === Stage.Improvements && !team.isReady && (
        <LoadingForm
          method="post"
          action={`/games/${game.id}/ready`}
          submitButtonText="Complete improvements"
        />
      )}
      <h3>Current training level: {team.trainingLevel}</h3>
      {hasImprovementsRemaining &&
        trainingCost !== null &&
        team.cash > trainingCost && (
          <LoadingForm
            method="post"
            submitButtonText={`Improve for ${trainingCost}M`}
          >
            <input
              type="hidden"
              name="improvement"
              value={Improvements.Training}
            />
          </LoadingForm>
        )}
      <h3>Current scouting level: {team.scoutingLevel}</h3>
      {hasImprovementsRemaining &&
        scoutingCost !== null &&
        team.cash > scoutingCost && (
          <LoadingForm
            method="post"
            submitButtonText={`Improve for ${scoutingCost}M`}
          >
            <input
              type="hidden"
              name="improvement"
              value={Improvements.Scouting}
            />
          </LoadingForm>
        )}
      <h3>Current stadium level: {team.stadiumLevel}</h3>
      {hasImprovementsRemaining &&
        stadiumCost !== null &&
        team.cash > stadiumCost && (
          <LoadingForm
            method="post"
            submitButtonText={`Improve for ${stadiumCost}M`}
          >
            <input
              type="hidden"
              name="improvement"
              value={Improvements.Stadium}
            />
          </LoadingForm>
        )}
    </>
  );
}
