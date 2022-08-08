import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getUserId } from "~/session.server";
import invariant from "tiny-invariant";
import LoadingForm from "~/components/loadingForm";
import Layout from "~/components/layout";
import { createGame } from "~/domain/games.server";

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (!userId) return redirect("/login");
  return json({});
};

export const action: ActionFunction = async ({ request, params }) => {
  const formData = await request.formData();
  let gameName = formData.get("game-name") as string;
  invariant(gameName, "game name not found");

  const game = await createGame(gameName);

  return redirect(`/games/${game.id}`);
};

export default function NewGamePage() {
  return (
    <Layout>
      <h1>New Game</h1>
      <LoadingForm className="flow" method="post" submitButtonText="Create">
        <div>
          <label htmlFor="game-name">Game Name</label>
        </div>
        <div>
          <input type="text" name="game-name" id="game-name" />
        </div>
      </LoadingForm>
    </Layout>
  );
}
