import { Link } from "@remix-run/react";
import type { ResultSummary } from "~/domain/fixtures.server";
import type { TeamSeasonSummary } from "~/domain/season.server";
import { Stage } from "~/engine/game";

type FixturesProps = {
  teamSeasons: TeamSeasonSummary[];
  results: ResultSummary[];
  usersTeamName: string;
};

export default function Fixtures({
  teamSeasons,
  results,
  usersTeamName,
}: FixturesProps) {
  return (
    <>
      <h4>Match day 1</h4>
      <FixtureGroup
        results={results}
        teamSeasons={teamSeasons}
        usersTeamName={usersTeamName}
        stage={Stage.Match1}
      />
      <h4>Match day 2</h4>
      <FixtureGroup
        results={results}
        teamSeasons={teamSeasons}
        usersTeamName={usersTeamName}
        stage={Stage.Match2}
      />
      <h4>Match day 3</h4>
      <FixtureGroup
        results={results}
        teamSeasons={teamSeasons}
        usersTeamName={usersTeamName}
        stage={Stage.Match3}
      />
      <h4>Match day 4</h4>
      <FixtureGroup
        results={results}
        teamSeasons={teamSeasons}
        usersTeamName={usersTeamName}
        stage={Stage.Match4}
      />
      <h4>Match day 5</h4>
      <FixtureGroup
        results={results}
        teamSeasons={teamSeasons}
        usersTeamName={usersTeamName}
        stage={Stage.Match5}
      />
      {results.filter((x) => x.stage === Stage.CupQuarterFinal).length !==
        0 && (
        <>
          <h4>Cup quarter final</h4>
          <FixtureGroup
            results={results}
            teamSeasons={teamSeasons}
            usersTeamName={usersTeamName}
            stage={Stage.CupQuarterFinal}
          />
        </>
      )}
      {results.filter((x) => x.stage === Stage.CupSemiFinal).length !== 0 && (
        <>
          <h4>Cup semi final</h4>
          <FixtureGroup
            results={results}
            teamSeasons={teamSeasons}
            usersTeamName={usersTeamName}
            stage={Stage.CupSemiFinal}
          />
        </>
      )}
      {results.filter((x) => x.stage === Stage.CupFinal).length !== 0 && (
        <>
          <h4>Cup final</h4>
          <FixtureGroup
            results={results}
            teamSeasons={teamSeasons}
            usersTeamName={usersTeamName}
            stage={Stage.CupFinal}
          />
        </>
      )}
    </>
  );
}

type FixtureGroupProps = {
  teamSeasons: TeamSeasonSummary[];
  results: ResultSummary[];
  usersTeamName: string;
  stage: Stage;
};

function FixtureGroup({
  results,
  teamSeasons,
  usersTeamName,
  stage,
}: FixtureGroupProps) {
  return (
    <table className="table">
      <tbody>
        {results
          .filter((x) => x.stage === stage)
          .map((x) => (
            <Fixture
              key={x.id}
              homeTeam={teamSeasons.find((y) => y.teamId === x.homeTeamId)!}
              awayTeam={
                x.awayTeamId
                  ? teamSeasons.find((y) => y.teamId === x.awayTeamId)
                  : undefined
              }
              realTeamName={x.realTeamName}
              result={x}
              usersTeamName={usersTeamName}
            />
          ))}
      </tbody>
    </table>
  );
}

type FixtureProps = {
  homeTeam: TeamSeasonSummary;
  awayTeam?: TeamSeasonSummary;
  realTeamName?: string;
  result: ResultSummary;
  usersTeamName: string;
};

function Fixture({
  homeTeam,
  awayTeam,
  realTeamName,
  result,
  usersTeamName,
}: FixtureProps) {
  const awayTeamName = awayTeam?.teamName || realTeamName || "";
  if (!result.draw && !result.simWin && !result.winningTeamId) {
    return (
      <tr>
        <td>
          ⏳{" "}
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
              awayTeam && awayTeam.teamName === usersTeamName
                ? "highlight-text"
                : ""
            }
          >
            {awayTeamName}
          </span>{" "}
          <Link to={`squads/${result.id}`}>«Squads»</Link>
        </td>
      </tr>
    );
  }
  if (result.draw) {
    return (
      <tr>
        <td>
          ✅{" "}
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
              awayTeam && awayTeam.teamName === usersTeamName
                ? "highlight-text"
                : ""
            }
          >
            {awayTeamName}
          </span>{" "}
          resulted in a draw. <Link to={`results/${result.id}`}>«Details»</Link>
        </td>
      </tr>
    );
  }
  const winningTeamName =
    result.winningTeamId === homeTeam.teamId && !result.simWin
      ? homeTeam.teamName
      : awayTeamName;
  const losingTeamName =
    result.winningTeamId !== homeTeam.teamId || result.simWin
      ? homeTeam.teamName
      : awayTeamName;
  return (
    <tr>
      <td>
        ✅{" "}
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
        <Link to={`results/${result.id}`}>«Details»</Link>
      </td>
    </tr>
  );
}
