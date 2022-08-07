import { Link } from "@remix-run/react";
import type { Result } from "~/domain/fixtures.server";
import type { TeamSeasonSummary } from "~/domain/season.server";

type FixturesProps = {
  teamSeasons: TeamSeasonSummary[];
  results: Result[];
  usersTeamName: string;
};

export default function Fixtures({
  teamSeasons,
  results,
  usersTeamName,
}: FixturesProps) {
  const sortedTeamSeasons = teamSeasons.sort((a, b) =>
    (a.teamId as string).localeCompare(b.teamId as string)
  );
  return (
    <>
      <h4>Match day 1</h4>
      <table className="table">
        <tbody>
          <Fixture
            homeTeam={sortedTeamSeasons[0]}
            awayTeam={sortedTeamSeasons[2]}
            results={results}
            usersTeamName={usersTeamName}
          />
          <Fixture
            homeTeam={sortedTeamSeasons[1]}
            awayTeam={sortedTeamSeasons[3]}
            results={results}
            usersTeamName={usersTeamName}
          />
        </tbody>
      </table>
      <h4>Match day 2</h4>
      <table className="table">
        <tbody>
          <Fixture
            homeTeam={sortedTeamSeasons[0]}
            awayTeam={sortedTeamSeasons[1]}
            results={results}
            usersTeamName={usersTeamName}
          />
          <Fixture
            homeTeam={sortedTeamSeasons[2]}
            awayTeam={sortedTeamSeasons[3]}
            results={results}
            usersTeamName={usersTeamName}
          />
        </tbody>
      </table>
      <h4>Match day 3</h4>
      <table className="table">
        <tbody>
          <Fixture
            homeTeam={sortedTeamSeasons[0]}
            awayTeam={sortedTeamSeasons[3]}
            results={results}
            usersTeamName={usersTeamName}
          />
          <Fixture
            homeTeam={sortedTeamSeasons[1]}
            awayTeam={sortedTeamSeasons[2]}
            results={results}
            usersTeamName={usersTeamName}
          />
        </tbody>
      </table>
    </>
  );
}

type FixtureProps = {
  homeTeam: TeamSeasonSummary;
  awayTeam: TeamSeasonSummary;
  results: Result[];
  usersTeamName: string;
};

function Fixture({ homeTeam, awayTeam, results, usersTeamName }: FixtureProps) {
  const result = results.find(
    (x) => x.homeTeamId === homeTeam.teamId && x.awayTeamId === awayTeam.teamId
  );
  if (!result) {
    return (
      <tr>
        <td>
          <span
            className={
              homeTeam.teamName === usersTeamName ? "highlight-text" : ""
            }
          >
            {homeTeam.teamName}
          </span>{" "}
          vs.{" "}
          <span
            className={
              awayTeam.teamName === usersTeamName ? "highlight-text" : ""
            }
          >
            {awayTeam.teamName}
          </span>
        </td>
      </tr>
    );
  }
  if (result && result.draw) {
    return (
      <tr>
        <td>
          <span
            className={
              homeTeam.teamName === usersTeamName ? "highlight-text" : ""
            }
          >
            {homeTeam.teamName}
          </span>{" "}
          vs.{" "}
          <span
            className={
              awayTeam.teamName === usersTeamName ? "highlight-text" : ""
            }
          >
            {awayTeam.teamName}
          </span>{" "}
          resulted in a draw.
        </td>
      </tr>
    );
  }
  const winningTeamName =
    result.winningTeamId === homeTeam.teamId
      ? homeTeam.teamName
      : awayTeam.teamName;
  const losingTeamName =
    result.winningTeamId !== homeTeam.teamId
      ? homeTeam.teamName
      : awayTeam.teamName;
  return (
    <tr>
      <td>
        <span
          className={winningTeamName === usersTeamName ? "highlight-text" : ""}
        >
          {winningTeamName}
        </span>{" "}
        defeated{" "}
        <span
          className={losingTeamName === usersTeamName ? "highlight-text" : ""}
        >
          {losingTeamName}
        </span>{" "}
        resulted in a draw.{" "}
        <Link to={`results/${result.id}`}>«View lineups»</Link>
      </td>
    </tr>
  );
}
