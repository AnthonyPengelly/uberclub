import { Link } from "@remix-run/react";
import type { PointLeaderboardEntry } from "~/domain/leaderboard.server";

export type PointLeaderboardProps = {
  pointLeaderboardEntries: PointLeaderboardEntry[];
};

export default function PointLeaderboard({
  pointLeaderboardEntries,
}: PointLeaderboardProps) {
  const sortedEntries = pointLeaderboardEntries
    .sort((a, b) => b.numberOfTeams - a.numberOfTeams)
    .sort((a, b) => b.seasonPoints - a.seasonPoints)
    .slice(0, 10);
  return (
    <>
      <h2>🏆 Season 10 Points Leaderboard 🏆</h2>
      <div className="flow | quote">
        <p>
          Play the long game until season 10, and go all in to see how many
          points you can rack up that season.
        </p>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th>Manager</th>
            <th>Pts.</th>
          </tr>
        </thead>
        <tbody>
          {sortedEntries.map((x, i) => (
            <tr key={x.id}>
              <td>
                {i === 0 && "🥇"}
                {i === 1 && "🥈"}
                {i === 2 && "🥉"}
              </td>
              <td>
                <Link to={x.gameUrl}>«{x.managerName}»</Link>
              </td>
              <td>{x.seasonPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
