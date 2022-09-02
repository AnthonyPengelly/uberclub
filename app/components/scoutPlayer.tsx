import type { GamePlayer } from "~/domain/players.server";
import type { Team } from "~/domain/team.server";
import { getScoutPrice } from "~/engine/scouting";
import { MAX_SQUAD_SIZE } from "~/engine/team";
import LoadingForm from "./loadingForm";
import PlayerDisplay from "./playerDisplay";

export type ScoutPlayerProps = {
  player: GamePlayer;
  squadSize: number;
  team: Team;
  canBuy: boolean;
};

export default function ScoutPlayer({
  player,
  team,
  squadSize,
  canBuy,
}: ScoutPlayerProps) {
  return (
    <>
      <PlayerDisplay player={player} key={player.id} />
      <div className="scout-info">
        <div>Sign for {getScoutPrice(player.overall, player.potential)}M</div>
        {!player.teamId &&
          (!canBuy ? (
            <div>Scouting finished</div>
          ) : team.cash < getScoutPrice(player.overall, player.potential) ? (
            <div>Not enough cash!</div>
          ) : squadSize >= MAX_SQUAD_SIZE ? (
            <div>Your squad is full!</div>
          ) : (
            <LoadingForm
              method="post"
              submitButtonText="Sign"
              buttonClass="mini-button"
            >
              <input type="hidden" name="player-id" value={player.id} />
            </LoadingForm>
          ))}
        {player.teamId && <div>✅</div>}
      </div>
    </>
  );
}
