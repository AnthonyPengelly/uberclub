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
import type { LineupPlayer } from "~/engine/lineup";
import {
  findPlayerInPosition,
  getLineupScores,
  hasChemistry,
  MAX_DEF_POSITION,
  MAX_MID_POSITION,
} from "~/engine/lineup";
import { getRealTeam } from "~/domain/realTeam.server";

type BasicTeam = { teamName: string; captainBoost: number };

type LoaderData = {
  homeTeam: { team: Team; lineup: GamePlayer[] };
  awayTeam: { team: BasicTeam; lineup: GamePlayer[] };
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
    <>
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
      />
      <h2 className="centre">{awayTeam.team.teamName}</h2>
      <Lineup
        players={awayTeam.lineup}
        team={awayTeam.team}
        direction="bottom-up"
        totalDefScore={result.awayDef}
        totalMidScore={result.awayMid}
        totalFwdScore={result.awayFwd}
      />
    </>
  );
}

type LineupProps = {
  players: GamePlayer[];
  team: BasicTeam;
  direction: "top-down" | "bottom-up";
  totalDefScore?: number;
  totalMidScore?: number;
  totalFwdScore?: number;
};

function Lineup({
  players,
  team,
  direction,
  totalDefScore,
  totalMidScore,
  totalFwdScore,
}: LineupProps) {
  const sortedPlayers = players.sort(
    (a, b) => (a.lineupPosition as number) - (b.lineupPosition as number)
  );
  const scores = getLineupScores(players, team.captainBoost);
  return (
    <div
      className={
        direction === "bottom-up" ? "lineup | flex reverse" : "lineup | flex"
      }
    >
      <div
        className={`lineup-segment flex  ${
          direction === "bottom-up" && "reverse"
        }`}
      >
        <div className="lineup-segment__summary">
          {scores.DEF}★
          {totalDefScore &&
            ` + ${totalDefScore - scores.DEF}🎲 (${totalDefScore})`}
        </div>
        <div
          className={`players ${
            direction === "bottom-up" ? "margin-top" : "margin-bottom"
          }`}
        >
          <PlayerDisplay player={sortedPlayers[0]} />
        </div>
        <div className="players">
          {sortedPlayers
            .filter(
              (x) =>
                (x.lineupPosition as number) > 1 &&
                (x.lineupPosition as number) <= MAX_DEF_POSITION
            )
            .map((x) => {
              const previousPlayer = findPlayerInPosition(
                players,
                x.lineupPosition! - 1
              );
              const chemistry = previousPlayer
                ? hasChemistry(x as LineupPlayer, previousPlayer)
                : false;
              return (
                <PlayerDisplay key={x.id} player={x} hasChemistry={chemistry} />
              );
            })}
        </div>
      </div>
      <div className="lineup-segment">
        <div className="lineup-segment__summary">
          {scores.MID}★
          {totalMidScore &&
            ` + ${totalMidScore - scores.MID}🎲 (${totalMidScore})`}
        </div>
        <div className="players">
          {sortedPlayers
            .filter(
              (x) =>
                (x.lineupPosition as number) > MAX_DEF_POSITION &&
                (x.lineupPosition as number) <= MAX_MID_POSITION
            )
            .map((x) => {
              const previousPlayer = findPlayerInPosition(
                players,
                x.lineupPosition! - 1
              );
              const chemistry = previousPlayer
                ? hasChemistry(x as LineupPlayer, previousPlayer)
                : false;
              return (
                <PlayerDisplay key={x.id} player={x} hasChemistry={chemistry} />
              );
            })}
        </div>
      </div>
      <div className="lineup-segment">
        <div className="lineup-segment__summary">
          FWD {scores.FWD}★
          {totalFwdScore &&
            ` + ${totalFwdScore - scores.FWD}🎲 (${totalFwdScore})`}
        </div>
        <div className="players">
          {sortedPlayers
            .filter((x) => (x.lineupPosition as number) > MAX_MID_POSITION)
            .map((x) => {
              const previousPlayer = findPlayerInPosition(
                players,
                x.lineupPosition! - 1
              );
              const chemistry = previousPlayer
                ? hasChemistry(x as LineupPlayer, previousPlayer)
                : false;
              return (
                <PlayerDisplay key={x.id} player={x} hasChemistry={chemistry} />
              );
            })}
        </div>
      </div>
    </div>
  );
}
