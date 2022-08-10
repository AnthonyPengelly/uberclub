import type { Result } from "~/domain/fixtures.server";
import type {
  Season as SeasonModel,
  TeamSeasonSummary,
} from "~/domain/season.server";
import Season from "./season";

export type PreviousSeasonsProps = {
  seasons: {
    season: SeasonModel;
    teamSeasons: TeamSeasonSummary[];
    results: Result[];
  }[];
  usersTeamName: string;
};

export default function PreviousSeasons({
  seasons,
  usersTeamName,
}: PreviousSeasonsProps) {
  return seasons.length !== 0 ? (
    <details className="flow">
      <summary>
        <h2 className="inline">Previous seasons</h2>
      </summary>
      {seasons.map(({ season, teamSeasons, results }) => (
        <Season
          key={season.id}
          season={season}
          teamSeasons={teamSeasons}
          results={results}
          startOpen={false}
          usersTeamName={usersTeamName}
        />
      ))}
    </details>
  ) : null;
}
