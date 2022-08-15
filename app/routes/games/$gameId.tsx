import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
import type { Game } from "~/domain/games.server";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { getGame } from "~/domain/games.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import {
  isOpenForPlayers,
  joinGame,
  overrideGameStageWithTeam,
} from "~/engine/game";
import LoadingForm from "~/components/loadingForm";
import Layout from "~/components/layout";

type LoaderData = {
  game: Game;
  team: Team | null;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const game = await getGame(params.gameId);
  const team = await getTeam(userId, params.gameId);
  if (!game) {
    throw new Response("Not Found", { status: 404 });
  }
  if (team) {
    overrideGameStageWithTeam(game, team);
  }

  return json({ game, team });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  let teamName = formData.get("team-name") as string;
  let managerName = formData.get("manager-name") as string;
  invariant(params.gameId, "gameId not found");
  invariant(teamName, "team name not found");
  invariant(managerName, "manager name not found");

  await joinGame({ userId, gameId: params.gameId, teamName, managerName });

  return redirect(`/games/${params.gameId}`);
};

export default function GamePage() {
  const { game, team } = useLoaderData<LoaderData>();

  return (
    <Layout game={game}>
      {team && <Outlet />}
      {!team &&
        (isOpenForPlayers(game) ? (
          <>
            <h1>🏆{game.name}🏆</h1>
            <LoadingForm className="flow" method="post" submitButtonText="Join">
              <div>
                <label htmlFor="team-name">Team Name</label>
              </div>
              <div>
                <input type="text" name="team-name" id="team-name" />
              </div>
              <div>
                <label htmlFor="manager-name">Manager Name</label>
              </div>
              <div>
                <input type="text" name="manager-name" id="manager-name" />
              </div>
            </LoadingForm>
          </>
        ) : (
          <>
            <h1>🏆{game.name}🏆</h1>
            <div>Sorry, this game is not open for registration</div>
          </>
        ))}
    </Layout>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
  return (
    <Layout>
      <h1>Something went wrong!</h1>
      <Link to=".">«Go back to game dashboard»</Link>
    </Layout>
  );
}
