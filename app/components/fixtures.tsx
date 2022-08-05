import { Link } from "@remix-run/react";
import type { Result } from "~/domain/fixtures.server";
import type { TeamSeasonSummary } from "~/domain/season.server";

type FixturesProps = {
  teamSeasons: TeamSeasonSummary[];
  results: Result[];
};

export default function Fixtures({ teamSeasons, results }: FixturesProps) {
  const sortedTeamSeasons = teamSeasons.sort((a, b) =>
    (a.teamId as string).localeCompare(b.teamId as string)
  );
  return (
    <table>
      <tbody>
        <tr>
          <th>Match Day</th>
          <th>Home</th>
          <th>Away</th>
          <th>Winner</th>
          <th></th>
        </tr>
        <Fixture
          homeTeam={sortedTeamSeasons[0]}
          awayTeam={sortedTeamSeasons[2]}
          results={results}
          matchDay={1}
        />
        <Fixture
          homeTeam={sortedTeamSeasons[1]}
          awayTeam={sortedTeamSeasons[3]}
          results={results}
          matchDay={1}
        />
        <Fixture
          homeTeam={sortedTeamSeasons[0]}
          awayTeam={sortedTeamSeasons[1]}
          results={results}
          matchDay={2}
        />
        <Fixture
          homeTeam={sortedTeamSeasons[2]}
          awayTeam={sortedTeamSeasons[3]}
          results={results}
          matchDay={2}
        />
        <Fixture
          homeTeam={sortedTeamSeasons[0]}
          awayTeam={sortedTeamSeasons[3]}
          results={results}
          matchDay={3}
        />
        <Fixture
          homeTeam={sortedTeamSeasons[1]}
          awayTeam={sortedTeamSeasons[2]}
          results={results}
          matchDay={3}
        />
      </tbody>
    </table>
  );
}

type FixtureProps = {
  homeTeam: TeamSeasonSummary;
  awayTeam: TeamSeasonSummary;
  results: Result[];
  matchDay: number;
};

function Fixture({ homeTeam, awayTeam, results, matchDay }: FixtureProps) {
  const result = results.find(
    (x) => x.homeTeamId === homeTeam.teamId && x.awayTeamId === awayTeam.teamId
  );
  return (
    <tr>
      <td>{matchDay}</td>
      <td>{homeTeam.teamName}</td>
      <td>{awayTeam.teamName}</td>
      {!result && <td>TBC</td>}
      {result && result.draw && <td>Draw</td>}
      {result && !result.draw && (
        <td>
          {result.winningTeamId === homeTeam.teamId
            ? homeTeam.teamName
            : awayTeam.teamName}
        </td>
      )}
      <td>{result && <Link to={`results/${result.id}`}>Lineups</Link>}</td>
    </tr>
  );
}
