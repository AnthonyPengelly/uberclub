import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getUserId } from "~/session.server";
import invariant from "tiny-invariant";
import LoadingForm from "~/components/loadingForm";
import Layout from "~/components/layout";
import { createGame } from "~/domain/games.server";
import type { PlayerCollection } from "~/domain/realTeam.server";
import { getPlayerCollections } from "~/domain/realTeam.server";
import { useLoaderData } from "@remix-run/react";

type LoaderData = {
  playerCollections: PlayerCollection[];
};

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (!userId) return redirect("/login");
  const playerCollections = await getPlayerCollections();
  return json({ playerCollections });
};

export const action: ActionFunction = async ({ request, params }) => {
  const formData = await request.formData();
  let gameName = formData.get("game-name") as string;
  invariant(gameName, "game name not found");
  let playerCollectionId = formData.get("player-collection") as string;
  invariant(playerCollectionId, "player collection not found");
  let victoryPoints = formData.get("victory-points") as string;

  const game = await createGame(
    gameName,
    playerCollectionId,
    victoryPoints ? parseInt(victoryPoints, 10) : undefined
  );

  return redirect(`/games/${game.id}`);
};

export default function NewGamePage() {
  const { playerCollections } = useLoaderData<LoaderData>();
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
        <div>
          <label htmlFor="victory-points">
            Victory Points Required in 1 season (100 for a normal game)
          </label>
        </div>
        <div>
          <input
            type="number"
            min={40}
            placeholder="100"
            name="victory-points"
            id="victory-points"
          />
        </div>
        <div>
          <label htmlFor="player-collection">Player Collection</label>
        </div>
        <div>
          <select name="player-collection" id="player-collection">
            {playerCollections.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </div>
      </LoadingForm>
    </Layout>
  );
}
