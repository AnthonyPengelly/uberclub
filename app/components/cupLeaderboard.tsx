import { Link } from "@remix-run/react";
import type { CupLeaderboardEntry } from "~/domain/cupLeaderboard.server";

export type CupLeaderboardProps = {
  cupLeaderboardEntries: CupLeaderboardEntry[];
};

export default function CupLeaderboard({
  cupLeaderboardEntries,
}: CupLeaderboardProps) {
  const sortedEntries = cupLeaderboardEntries
    .sort((a, b) => b.seasonPoints - a.seasonPoints)
    .sort((a, b) => b.numberOfTeams - a.numberOfTeams)
    .sort((a, b) => a.season - b.season);
  return (
    <>
      <h2>🏆 Cup Winners Leaderboard 🏆</h2>
      <div className="flow | quote">
        <p>
          Win the cup in as few seasons as possible! Ties are decided by the
          most other teams in the game, followed by the points that season.
        </p>
        <p>
          How about starting a single player game with a high victory points
          threshold to see if you can get on the list?
        </p>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th></th>
            <th>Manager</th>
            <th>Season</th>
            <th>Teams</th>
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
                <Link to={x.fixtureUrl}>«{x.managerName}»</Link>
              </td>
              <td>{x.season}</td>
              <td>{x.numberOfTeams}</td>
              <td>{x.seasonPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
