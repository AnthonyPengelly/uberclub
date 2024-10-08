import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import CupLeaderboard from "~/components/cupLeaderboard";
import Layout from "~/components/layout";
import type {
  CupLeaderboardEntry,
  PointLeaderboardEntry,
} from "~/domain/leaderboard.server";
import { getPointLeaderboard } from "~/domain/leaderboard.server";
import { getCupLeaderboard } from "~/domain/leaderboard.server";
import type { DetailedGame } from "~/domain/games.server";
import { getGamesList } from "~/domain/games.server";
import { requireUserId } from "~/session.server";
import PointLeaderboard from "~/components/pointLeaderboard";
import type { TeamSeasonSummary } from "~/domain/season.server";
import { getTopTeamSeasonsEver } from "~/domain/season.server";
import SquadLeaderboard from "~/components/squadLeaderboard";

type LoaderData = {
  games: DetailedGame[];
  cupLeaderboardEntries: CupLeaderboardEntry[];
  pointLeaderboardEntries: PointLeaderboardEntry[];
  squadLeaderboardEntries: TeamSeasonSummary[];
};

export const loader: LoaderFunction = async ({ request }) => {
  await requireUserId(request);
  const games = await getGamesList();
  const cupLeaderboardEntries = await getCupLeaderboard();
  const pointLeaderboardEntries = await getPointLeaderboard();
  const squadLeaderboardEntries = await getTopTeamSeasonsEver();
  return json<LoaderData>({
    games,
    cupLeaderboardEntries,
    pointLeaderboardEntries,
    squadLeaderboardEntries,
  });
};

export default function Index() {
  const {
    games,
    cupLeaderboardEntries,
    pointLeaderboardEntries,
    squadLeaderboardEntries,
  } = useLoaderData<LoaderData>();
  return (
    <Layout>
      <h1>Games</h1>
      <article className="flow | quote">
        <p>
          Welcome to Uberclub by post. Put together a ragtag group of
          footballers and guide them to glory. The game is designed to be played
          asynchronously so there is no time limit, but try to check in at least
          once a day, or everyone will get bored!
        </p>
        <p>Join a game below to get started 💪</p>
      </article>
      <Link className="block" to="games/new">
        + New Game
      </Link>
      <table className="table">
        <thead>
          <tr>
            <th>Game</th>
            <th>Teams</th>
            <th>Season</th>
          </tr>
        </thead>
        <tbody>
          {games
            .filter((x) => !x.winningTeam)
            .map((game) => (
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
      <CupLeaderboard cupLeaderboardEntries={cupLeaderboardEntries} />
      <PointLeaderboard pointLeaderboardEntries={pointLeaderboardEntries} />
      <SquadLeaderboard squadLeaderboardEntries={squadLeaderboardEntries} />
      <h2>Past games</h2>

      <table className="table">
        <thead>
          <tr>
            <th>Game</th>
            <th>Winner</th>
          </tr>
        </thead>
        <tbody>
          {games
            .filter((x) => x.winningTeam)
            .map((game) => (
              <tr key={game.id}>
                <td>
                  <Link to={`/games/${game.id}`}>«{game.name}»</Link>
                </td>
                <td>{game.winningTeam}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </Layout>
  );
}
