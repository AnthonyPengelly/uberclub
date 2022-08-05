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
import type { Season, TeamSeasonSummary } from "~/domain/season.server";
import { getAllSeasons } from "~/domain/season.server";
import { getTeamSeasons } from "~/domain/season.server";

type LoaderData = {
  game: Game;
  team: Team;
  seasons: { season: Season; teamSeasons: TeamSeasonSummary[] }[];
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
    }))
  );
  const team = await getTeam(userId, params.gameId);
  const logs = await getGameLogs(params.gameId);

  return json({ game, team, logs, seasons: seasonsMap });
};

export default function GameDetailsPage() {
  const { team, logs, seasons } = useLoaderData<LoaderData>();

  return (
    <div>
      <h2>Welcome, {team.managerName}</h2>
      <Link to="team">Team</Link>
      {seasons.map(({ season, teamSeasons }) => (
        <div key={season.id}>
          <h3>{season.name}</h3>
          {teamSeasons.length !== 0 ? (
            <table>
              <tbody>
                <tr>
                  <th>Name</th>
                  <th>Starting Score</th>
                  <th>Score</th>
                </tr>
                {teamSeasons
                  .sort((a, b) => b.score - a.score)
                  .map((x) => (
                    <tr key={x.id}>
                      <td>{x.teamName}</td>
                      <td>{x.startingScore}</td>
                      <td>{x.score}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          ) : (
            <h4>Pre Season</h4>
          )}
        </div>
      ))}
      <ul>
        {logs.map((x) => (
          <li key={x.id}>
            {x.createdAt} - {x.event}
          </li>
        ))}
      </ul>
    </div>
  );
}
