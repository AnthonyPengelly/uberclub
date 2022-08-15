import type { GamePlayer } from "~/domain/players.server";

export type PlayerDisplayProps = {
  player?: GamePlayer;
  hasChemistry?: boolean;
  children?: React.ReactNode | React.ReactNode[];
  noPlayerText?: string;
};

export default function PlayerDisplay({
  player,
  hasChemistry,
  noPlayerText,
  children,
}: PlayerDisplayProps) {
  if (!player) {
    return (
      <div className="player player__placeholder">
        <div className="player__name">{noPlayerText || "None"}</div>
        {children && <div className="player__actions">{children}</div>}
      </div>
    );
  }
  return (
    <div
      className={`player player__${player.position}`}
      data-injured={!!player.injured}
    >
      <div className="player__name">{player.name}</div>
      <div className="player__stars">
        {[...Array(player.stars).keys()].map(() => "★").join("")}
        {[...Array(player.potential - player.stars).keys()]
          .map(() => "☆")
          .join("")}
      </div>
      <img className="player__image" src={player.imageUrl} alt={player.name} />
      <div className="player__position">{player.position}</div>
      <div className="player__team">{player.team}</div>
      {children && <div className="player__actions">{children}</div>}
      {hasChemistry ? <div className="player__chemistry">★</div> : null}
      {player.captain ? <div className="player__captain">C</div> : null}
    </div>
  );
}
