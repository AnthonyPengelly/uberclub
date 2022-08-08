import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
import type { Game } from "~/domain/games.server";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { getGame } from "~/domain/games.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { GameLog } from "~/domain/logs.server";
import { getGameLogs } from "~/domain/logs.server";
import type {
  Season as SeasonModel,
  TeamSeasonSummary,
} from "~/domain/season.server";
import { getAllSeasons } from "~/domain/season.server";
import { getTeamSeasons } from "~/domain/season.server";
import type { Result } from "~/domain/fixtures.server";
import { getResults } from "~/domain/fixtures.server";
import Season from "~/components/season";
import PreviousSeasons from "~/components/previousSeasons";
import DateTime from "~/components/dateTime";

type LoaderData = {
  game: Game;
  team: Team;
  seasons: {
    season: SeasonModel;
    teamSeasons: TeamSeasonSummary[];
    results: Result[];
  }[];
  logs: GameLog[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const game = await getGame(params.gameId);
  if (!game) {
    throw new Response("Not Found", { status: 404 });
  }
  const seasons = await getAllSeasons(params.gameId);
  const seasonsMap = await Promise.all(
    seasons.map(async (x) => ({
      season: x,
      teamSeasons: await getTeamSeasons(x.id),
      results: await getResults(x.id),
    }))
  );
  const team = await getTeam(userId, params.gameId);
  const logs = await getGameLogs(params.gameId);

  return json({ game, team, logs, seasons: seasonsMap });
};

export default function GameDetailsPage() {
  const { team, logs, seasons, game } = useLoaderData<LoaderData>();

  return (
    <>
      <h1>🏆{game.name}🏆</h1>
      <article className="quote">
        <>
          {team.isReady ? (
            <p>
              ✅ Good work <strong>{team.managerName}</strong>,{" "}
              <strong>{team.teamName}</strong> are ready for the next phase, put
              your feet up.
            </p>
          ) : (
            <p>
              ⏳ <strong>{team.teamName}</strong> are waiting for your next
              move, <strong>{team.managerName}</strong>!
            </p>
          )}
        </>
        <p>
          <Link to="team">«View your team here»</Link>
        </p>
      </article>
      <h2>Current Season</h2>
      {seasons[0] && (
        <Season
          season={seasons[0].season}
          teamSeasons={seasons[0].teamSeasons}
          results={seasons[0].results}
          startOpen={true}
          usersTeamName={team.teamName}
        />
      )}
      <PreviousSeasons
        seasons={seasons.slice(1)}
        usersTeamName={team.teamName}
      />

      <h2>Game log</h2>
      <table className="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Event</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((x) => (
            <tr key={x.id}>
              <td data-fit>
                <DateTime dateTime={x.createdAt} />
              </td>
              <td>{x.event}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
