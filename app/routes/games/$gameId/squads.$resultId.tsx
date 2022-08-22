import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";
import type { Result } from "~/domain/fixtures.server";
import { getResult } from "~/domain/fixtures.server";
import type { GamePlayer } from "~/domain/players.server";
import { getRealTeamPlayers, getTeamPlayers } from "~/domain/players.server";
import type { Team } from "~/domain/team.server";
import { getTeamById } from "~/domain/team.server";
import PlayerDisplay from "~/components/playerDisplay";
import { maskLineupInfo } from "~/engine/lineup";
import { getRealTeam } from "~/domain/realTeam.server";

type BasicTeam = { teamName: string; captainBoost: number };

type LoaderData = {
  homeTeam: { team: Team; players: GamePlayer[] };
  awayTeam: { team: BasicTeam; players: GamePlayer[] };
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

  return json<LoaderData>({
    homeTeam: {
      team: homeTeam,
      players: maskLineupInfo(await getTeamPlayers(homeTeam.id)),
    },
    awayTeam: awayTeam
      ? {
          team: awayTeam,
          players: maskLineupInfo(await getTeamPlayers(awayTeam.id)),
        }
      : {
          team: { teamName: realTeam?.name || "", captainBoost: 1 },
          players: maskLineupInfo(
            await getRealTeamPlayers(realTeam!.id, params.gameId)
          ),
        },
    result,
  });
};

export default function SquadsPage() {
  const { homeTeam, awayTeam } = useLoaderData<LoaderData>();

  return (
    <>
      <h1 className="centre">
        {homeTeam.team.teamName} vs. {awayTeam.team.teamName}
      </h1>
      <h2 className="centre">{homeTeam.team.teamName}</h2>
      <div className="players squad-list">
        {homeTeam.players.map((x) => (
          <PlayerDisplay key={x.id} player={x} />
        ))}
      </div>
      <h2 className="centre">{awayTeam.team.teamName}</h2>
      <div className="players squad-list">
        {awayTeam.players.map((x) => (
          <PlayerDisplay key={x.id} player={x} />
        ))}
      </div>
    </>
  );
}
