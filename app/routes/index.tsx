import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import type { Game} from "~/domain/games.server";
import { getGamesList } from "~/domain/games.server";
import { requireUserId } from "~/session.server";

type LoaderData = {
  games: Game[];
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireUserId(request);
  const games = await getGamesList();
  return json({ games });
};

export default function Index() {
  const { games } = useLoaderData<LoaderData>();
  return (
    <main className="relative min-h-screen bg-white sm:flex sm:items-center sm:justify-center">
      <h1>Games</h1>
      <ul>
        {games.map((game) => (
          <li key={game.id}>
            <Link to={`/games/${game.id}`}>{game.name}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
