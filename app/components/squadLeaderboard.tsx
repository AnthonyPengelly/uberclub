import { Link } from "@remix-run/react";
import type { TeamSeasonSummary } from "~/domain/season.server";

export type SquadLeaderboardProps = {
  squadLeaderboardEntries: TeamSeasonSummary[];
};

export default function SquadLeaderboard({
  squadLeaderboardEntries,
}: SquadLeaderboardProps) {
  const sortedEntries = squadLeaderboardEntries
    .sort((a, b) => b.score - a.score)
    .sort((a, b) => a.season - b.season)
    .sort((a, b) => b.startingScore - a.startingScore)
    .slice(0, 10);
  return (
    <>
      <h2>๐ All time top squads ๐</h2>
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th>Team</th>
            <th style={{ whiteSpace: "normal" }}>Squad score</th>
            <th>Season</th>
          </tr>
        </thead>
        <tbody>
          {sortedEntries.map((x, i) => (
            <tr key={x.id}>
              <td>
                {i === 0 && "๐ฅ"}
                {i === 1 && "๐ฅ"}
                {i === 2 && "๐ฅ"}
              </td>
              <td>
                <Link to={`/games/${x.gameId}`}>ยซ{x.teamName}ยป</Link>
              </td>
              <td>{x.startingScore}</td>
              <td>{x.season}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
