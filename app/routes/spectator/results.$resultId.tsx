import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import type { Result } from "~/domain/fixtures.server";
import { getFixtureLineups, getResult } from "~/domain/fixtures.server";
import type { GamePlayer } from "~/domain/players.server";
import type { Team } from "~/domain/team.server";
import { getTeamById } from "~/domain/team.server";
import { getRealTeam } from "~/domain/realTeam.server";
import Lineup from "~/components/lineup";
import Layout from "~/components/layout";

type BasicTeam = { teamName: string; captainBoost: number };

type LoaderData = {
  homeTeam: { team: Team; lineup: GamePlayer[] };
  awayTeam: { team: BasicTeam; lineup: GamePlayer[] };
  result: Result;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.resultId, "resultId not found");
  const result = await getResult(params.resultId);
  if (!result) {
    throw new Response("Not Found", { status: 404 });
  }
  const homeTeam = await getTeamById(result.homeTeamId);
  const awayTeam = result.awayTeamId
    ? await getTeamById(result.awayTeamId)
    : undefined;
  const realTeam = result.realTeamId
    ? await getRealTeam(result.realTeamId)
    : undefined;
  const players = await getFixtureLineups(result.id);

  return json<LoaderData>({
    homeTeam: {
      team: homeTeam,
      lineup: players.filter((x) => x.teamId === homeTeam.id && !x.realTeamId),
    },
    awayTeam: awayTeam
      ? {
          team: awayTeam,
          lineup: players.filter(
            (x) => x.teamId === awayTeam.id && !x.realTeamId
          ),
        }
      : {
          team: { teamName: realTeam?.name || "", captainBoost: 1 },
          lineup: players.filter((x) => x.realTeamId === result.realTeamId),
        },
    result,
  });
};

export default function ResultsPage() {
  const { homeTeam, awayTeam, result } = useLoaderData<LoaderData>();
  const winningText = result.draw
    ? "Draw"
    : result.winningTeamId === homeTeam.team.id
    ? `${homeTeam.team.teamName} Win`
    : `${awayTeam.team.teamName} Win`;

  return (
    <Layout>
      <h1>Fixture result</h1>
      <div className="quote">
        {homeTeam.team.teamName} vs {awayTeam.team.teamName} resulted in a{" "}
        <strong>{winningText}</strong>
      </div>
      <h2 className="centre">{homeTeam.team.teamName}</h2>
      <Lineup
        players={homeTeam.lineup}
        team={homeTeam.team}
        direction="top-down"
        totalDefScore={result.homeDef}
        totalMidScore={result.homeMid}
        totalFwdScore={result.homeFwd}
        opponentDefScore={result.awayDef}
        opponentMidScore={result.awayMid}
        opponentFwdScore={result.awayFwd}
      />
      <h2 className="centre">{awayTeam.team.teamName}</h2>
      <Lineup
        players={awayTeam.lineup}
        team={awayTeam.team}
        direction="bottom-up"
        totalDefScore={result.awayDef}
        totalMidScore={result.awayMid}
        totalFwdScore={result.awayFwd}
        opponentDefScore={result.homeDef}
        opponentMidScore={result.homeMid}
        opponentFwdScore={result.homeFwd}
      />
    </Layout>
  );
}
