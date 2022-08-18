import type { Team } from "~/domain/team.server";
import type { Season as SeasonModel } from "~/domain/season.server";
import type { PositionedTeamSeason } from "~/engine/leagueTable";
import type { ResultSummary } from "~/domain/fixtures.server";
import { seasonIsComplete } from "~/engine/season";

export type TeamListProps = {
  teams: Team[];
  seasons: {
    season: SeasonModel;
    teamSeasons: PositionedTeamSeason[];
    results: ResultSummary[];
  }[];
};

export default function TeamList({ teams, seasons }: TeamListProps) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th></th>
          <th>Team</th>
          <th>Manager</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {teams
          .sort((a, b) => a.teamName.localeCompare(b.teamName))
          .map((x) => (
            <tr key={x.id}>
              <td>{x.isReady ? "✅" : "⏳"}</td>
              <td>{x.teamName}</td>
              <td>{x.managerName}</td>
              <td>
                {[
                  ...Array(
                    seasons.filter(
                      (season) =>
                        season.teamSeasons.find((y) => y.teamId === x.id)
                          ?.position === 1 && seasonIsComplete(season.results)
                    ).length
                  ).keys(),
                ]
                  .map(() => "🥇")
                  .join("")}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  );
}
