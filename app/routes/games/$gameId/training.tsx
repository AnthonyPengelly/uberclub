import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { GamePlayer } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import type { ActionFunction } from "@remix-run/node";
import { canTrain, getTrainingLogs, trainPlayer } from "~/engine/training";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { overrideGameStageWithTeam, Stage } from "~/engine/game";
import LoadingForm from "~/components/loadingForm";
import PlayerDisplay from "~/components/playerDisplay";

type LoaderData = {
  team: Team;
  game: Game;
  players: GamePlayer[];
  trainingLogs: { id: string }[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);
  const team = await getTeam(userId, params.gameId);
  overrideGameStageWithTeam(game, team);

  const players = await getTeamPlayers(team.id);
  const trainingLogs = await getTrainingLogs(team);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ game, team, players, trainingLogs });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);
  const team = await getTeam(userId, params.gameId);
  overrideGameStageWithTeam(game, team);

  const formData = await request.formData();
  let playerId = formData.get("player-id") as string;
  await trainPlayer(playerId, team);

  const players = await getTeamPlayers(team.id);
  const trainingLogs = await getTrainingLogs(team);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ game, team, players, trainingLogs });
};

export default function TrainingPage() {
  const { game, team, players, trainingLogs } = useLoaderData<LoaderData>();
  const hasTrainingRemaining = canTrain(game, trainingLogs, team);

  return (
    <>
      <h1>{team.teamName} training camp</h1>
      <div className="flow | quote">
        <p>
          Welcome to the pre season training camp. As a level{" "}
          {team.trainingLevel} club, {team.trainingLevel} player(s) may be
          improved by 1 star!
        </p>
        {!hasTrainingRemaining && (
          <p>
            You are not currently able to do any training, come back at the
            start of next season.
          </p>
        )}
      </div>
      {game.stage === Stage.Training && !team.isReady && (
        <>
          <LoadingForm
            method="post"
            action={`/games/${game.id}/stage-override`}
            submitButtonText="Complete training"
            onSubmit={(event) => {
              if (
                team.trainingLevel - trainingLogs.length !== 0 &&
                !confirm(
                  `You still have training remaining, are you sure you want to continue?`
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="current-stage" value={Stage.Training} />
          </LoadingForm>
          <p>
            {team.trainingLevel - trainingLogs.length}/{team.trainingLevel}{" "}
            remaining
          </p>
        </>
      )}
      <div className="players squad-list">
        {players.map((x) => (
          <PlayerDisplay key={x.id} player={x}>
            {x.potential - x.stars > 0 && hasTrainingRemaining ? (
              <LoadingForm
                method="post"
                submitButtonText="Train"
                buttonClass="mini-button button-secondary"
              >
                <input type="hidden" name="player-id" value={x.id} />
              </LoadingForm>
            ) : null}
          </PlayerDisplay>
        ))}
      </div>
    </>
  );
}
