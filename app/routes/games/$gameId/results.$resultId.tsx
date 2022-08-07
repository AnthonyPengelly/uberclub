import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import type { Result } from "~/domain/fixtures.server";
import { getFixtureLineups, getResult } from "~/domain/fixtures.server";
import type { GamePlayer } from "~/domain/players.server";
import type { Team } from "~/domain/team.server";
import { getTeamById } from "~/domain/team.server";
import PlayerDisplay from "~/components/playerDisplay";
import {
  getLineupScores,
  MAX_DEF_POSITION,
  MAX_MID_POSITION,
} from "~/engine/lineup";

type LoaderData = {
  homeTeam: { team: Team; lineup: GamePlayer[] };
  awayTeam: { team: Team; lineup: GamePlayer[] };
  result: Result;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.gameId, "gameId not found");
  invariant(params.resultId, "resultId not found");
  const result = await getResult(params.resultId);
  if (!result) {
    throw new Response("Not Found", { status: 404 });
  }
  const homeTeam = await getTeamById(result.homeTeamId);
  const awayTeam = await getTeamById(result.awayTeamId);
  const players = await getFixtureLineups(result.id);

  return json({
    homeTeam: {
      team: homeTeam,
      lineup: players.filter((x) => x.teamId === homeTeam.id),
    },
    awayTeam: {
      team: awayTeam,
      lineup: players.filter((x) => x.teamId === awayTeam.id),
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
    <div>
      <h1>Result: {winningText}</h1>
      <h2>{homeTeam.team.teamName}</h2>
      <Lineup players={homeTeam.lineup} team={homeTeam.team} />
      <h2>{awayTeam.team.teamName}</h2>
      <Lineup players={awayTeam.lineup} team={awayTeam.team} />
    </div>
  );
}

function Lineup({ players, team }: { players: GamePlayer[]; team: Team }) {
  const sortedPlayers = players.sort(
    (a, b) => (a.lineupPosition as number) - (b.lineupPosition as number)
  );
  const scores = getLineupScores(players, team.captainBoost);
  return (
    <>
      <h3 className="centre">GKP</h3>
      <div className="players">
        <PlayerDisplay player={sortedPlayers[0]} />
      </div>
      <h3 className="centre">DEF {scores.DEF}★ (incl. GKP)</h3>
      <div className="players">
        {sortedPlayers
          .filter(
            (x) =>
              (x.lineupPosition as number) > 1 &&
              (x.lineupPosition as number) <= MAX_DEF_POSITION
          )
          .map((x) => (
            <PlayerDisplay key={x.id} player={x} />
          ))}
      </div>
      <h3 className="centre">MID {scores.MID}★</h3>
      <div className="players">
        {sortedPlayers
          .filter(
            (x) =>
              (x.lineupPosition as number) > MAX_DEF_POSITION &&
              (x.lineupPosition as number) <= MAX_MID_POSITION
          )
          .map((x) => (
            <PlayerDisplay key={x.id} player={x} />
          ))}
      </div>
      <h3 className="centre">FWD {scores.FWD}★</h3>
      <div className="players">
        {sortedPlayers
          .filter((x) => (x.lineupPosition as number) > MAX_MID_POSITION)
          .map((x) => (
            <PlayerDisplay key={x.id} player={x} />
          ))}
      </div>
    </>
  );
}
