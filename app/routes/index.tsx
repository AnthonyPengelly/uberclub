import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import Layout from "~/components/layout";
import type { DetailedGame } from "~/domain/games.server";
import { getGamesList } from "~/domain/games.server";
import { requireUserId } from "~/session.server";

type LoaderData = {
  games: DetailedGame[];
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireUserId(request);
  const games = await getGamesList();
  return json({ games });
};

export default function Index() {
  const { games } = useLoaderData<LoaderData>();
  return (
    <Layout>
      <h1>Games</h1>
      <article className="flow | quote">
        <p>
          Welcome to Uberclub by post. Build the greatest team in the world
          using real players and go head to head with your friends. The game is
          designed to be played asynchronously so there is no time limit, but
          try to check in at least once a day, or everyone will get bored!
        </p>
        <p>Join a game below to get started 💪</p>
      </article>
      <Link to="games/new">+ New Game</Link>
      <table className="table">
        <thead>
          <tr>
            <th>Game</th>
            <th>Teams</th>
            <th>Season</th>
          </tr>
        </thead>
        <tbody>
          {games.map((game) => (
            <tr key={game.id}>
              <td>
                <Link to={`/games/${game.id}`}>«{game.name}»</Link>
              </td>
              <td>{game.players}</td>
              <td>
                {game.seasons.length !== 0 &&
                  game.seasons.sort(
                    (a, b) => b.seasonNumber - a.seasonNumber
                  )[0].seasonNumber}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Layout>
  );
}
