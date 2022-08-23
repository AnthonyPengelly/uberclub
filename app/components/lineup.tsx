import type { GamePlayer } from "~/domain/players.server";
import type { LineupPlayer } from "~/engine/lineup";
import {
  findPlayerInPosition,
  getChemistry,
  getLineupScores,
  MAX_DEF_POSITION,
  MAX_MID_POSITION,
} from "~/engine/lineup";
import { getSegmentResult } from "~/engine/season";
import PlayerDisplay from "./playerDisplay";

export type BasicTeam = { teamName: string; captainBoost: number };

export type LineupProps = {
  players: GamePlayer[];
  team: BasicTeam;
  direction: "top-down" | "bottom-up";
  totalDefScore?: number;
  totalMidScore?: number;
  totalFwdScore?: number;
  opponentDefScore?: number;
  opponentMidScore?: number;
  opponentFwdScore?: number;
};

export default function Lineup({
  players,
  team,
  direction,
  totalDefScore,
  totalMidScore,
  totalFwdScore,
  opponentDefScore,
  opponentMidScore,
  opponentFwdScore,
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
        <div
          className="lineup-segment__summary"
          data-result={getSegmentResult(totalDefScore, opponentFwdScore)}
        >
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
                ? getChemistry(x as LineupPlayer, previousPlayer)
                : 0;
              return (
                <PlayerDisplay key={x.id} player={x} chemistry={chemistry} />
              );
            })}
        </div>
      </div>
      <div className="lineup-segment">
        <div
          className="lineup-segment__summary"
          data-result={getSegmentResult(totalMidScore, opponentMidScore)}
        >
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
                ? getChemistry(x as LineupPlayer, previousPlayer)
                : 0;
              return (
                <PlayerDisplay key={x.id} player={x} chemistry={chemistry} />
              );
            })}
        </div>
      </div>
      <div className="lineup-segment">
        <div
          className="lineup-segment__summary"
          data-result={getSegmentResult(totalFwdScore, opponentDefScore)}
        >
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
                ? getChemistry(x as LineupPlayer, previousPlayer)
                : 0;
              return (
                <PlayerDisplay key={x.id} player={x} chemistry={chemistry} />
              );
            })}
        </div>
      </div>
    </div>
  );
}
