import type { ResultSummary } from "~/domain/fixtures.server";
import type { Season as SeasonModel } from "~/domain/season.server";
import { Stage } from "~/engine/game";
import type { PositionedTeamSeason } from "~/engine/leagueTable";
import { orderTeamsInSeason } from "~/engine/leagueTable";
import Fixtures from "./fixtures";

export type SeasonProps = {
  season: SeasonModel;
  teamSeasons: PositionedTeamSeason[];
  results: ResultSummary[];
  startOpen: boolean;
  usersTeamName: string;
};

export default function Season({
  season,
  teamSeasons,
  results,
  startOpen,
  usersTeamName,
}: SeasonProps) {
  const seasonComplete = !results.some(
    (x) =>
      !x.draw &&
      !x.simWin &&
      !x.winningTeamId &&
      x.stage !== Stage.CupQuarterFinal &&
      x.stage !== Stage.CupSemiFinal &&
      Stage.CupFinal
  );
  return (
    <details open={startOpen} className="flow">
      <summary>
        <h3 className="inline">{season.name}</h3>
      </summary>
      {teamSeasons.length !== 0 ? (
        <>
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Name (squad score)</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {orderTeamsInSeason(teamSeasons).map((x, i) => (
                <tr key={x.id}>
                  <td className="centre">
                    {x.position === 1 && seasonComplete ? "🏆" : x.position}
                  </td>
                  <td
                    className={
                      x.teamName === usersTeamName ? "highlight-text" : ""
                    }
                  >
                    {x.teamName} ({x.startingScore})
                  </td>
                  <td>{x.score}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <details className="flow">
            <summary>
              <h3 className="inline">{season.name} fixtures</h3>
            </summary>
            <Fixtures
              teamSeasons={teamSeasons}
              results={results}
              usersTeamName={usersTeamName}
            />
          </details>
        </>
      ) : (
        <table className="table">
          <tbody>
            <tr>
              <td>Currently in pre season</td>
            </tr>
          </tbody>
        </table>
      )}
    </details>
  );
}
