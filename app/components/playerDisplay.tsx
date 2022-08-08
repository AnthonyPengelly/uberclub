import type { GamePlayer } from "~/domain/players.server";

export type PlayerDisplayProps = {
  player?: GamePlayer;
  hasChemistry?: boolean;
  children?: React.ReactNode | React.ReactNode[];
};

export default function PlayerDisplay({
  player,
  hasChemistry,
  children,
}: PlayerDisplayProps) {
  if (!player) {
    return (
      <div
        className={`player player__placeholder ${
          children ? "margin-bottom" : ""
        }`}
      >
        <div className="player__name">None selected</div>
        {children && <div className="player__actions">{children}</div>}
      </div>
    );
  }
  return (
    <div
      className={`player player__${player.position} ${
        children ? "margin-bottom" : ""
      }`}
    >
      <div className="player__name">{player.name}</div>
      <div className="player__stars">
        {[...Array(player.stars).keys()].map(() => "★").join("")}
        {[...Array(player.potential - player.stars).keys()]
          .map(() => "☆")
          .join("")}
      </div>
      <img
        className="player__image"
        src={player.imageUrl}
        alt={player.name}
        width={40}
        height={40}
      />
      <div className="player__team">{player.team}</div>
      {hasChemistry ? <div className="player__chemistry">★</div> : null}
      {player.captain ? <div className="player__captain">C</div> : null}
      {children && <div className="player__actions">{children}</div>}
    </div>
  );
}
