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
    <div>
      <h1>{winningText}</h1>
      <h2>{homeTeam.team.teamName}</h2>
      <Lineup
        players={homeTeam.lineup}
        team={homeTeam.team}
        direction="top-down"
        totalDefScore={result.homeDef}
        totalMidScore={result.homeMid}
        totalFwdScore={result.homeFwd}
      />
      <h2>{awayTeam.team.teamName}</h2>
      <Lineup
        players={awayTeam.lineup}
        team={awayTeam.team}
        direction="bottom-up"
        totalDefScore={result.awayDef}
        totalMidScore={result.awayMid}
        totalFwdScore={result.awayFwd}
      />
    </div>
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
        direction === "bottom-up" ? "flex-flow | reverse" : "flex-flow"
      }
    >
      <div className="flow">
        <h3 className="centre">GKP</h3>
        <div className="players">
          <PlayerDisplay player={sortedPlayers[0]} />
        </div>
      </div>
      <div className="flow">
        <h3 className="centre">
          DEF {scores.DEF}★
          {totalDefScore &&
            ` + ${totalDefScore - scores.DEF}🎲 (${totalDefScore})`}
        </h3>
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
      <div className="flow">
        <h3 className="centre">
          MID {scores.MID}★
          {totalMidScore &&
            ` + ${totalMidScore - scores.MID}🎲 (${totalMidScore})`}
        </h3>
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
      <div className="flow">
        <h3 className="centre">
          FWD {scores.FWD}★
          {totalFwdScore &&
            ` + ${totalFwdScore - scores.FWD}🎲 (${totalFwdScore})`}
        </h3>
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
