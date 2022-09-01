import type { GamePlayer } from "~/domain/players.server";

export type PlayerDisplayProps = {
  player?: GamePlayer;
  chemistry?: number;
  children?: React.ReactNode | React.ReactNode[];
  noPlayerText?: string;
};

export default function PlayerDisplay({
  player,
  chemistry = 0,
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
        {player.potential > player.stars &&
          [...Array(player.potential - player.stars).keys()]
            .map(() => "☆")
            .join("")}
      </div>
      <div className="relative">
        <img
          className="player__image"
          src={player.imageUrl}
          alt={player.name}
        />
        {player.country ? (
          <img
            className="player__country"
            src={player.country.imageUrl}
            alt={player.country.name}
            title={player.country.name}
          />
        ) : null}
        {player.teamImage ? (
          <img
            className="player__team-badge"
            src={player.teamImage}
            alt={player.team}
            title={player.team}
          />
        ) : null}
        {player.loan ? (
          <div
            aria-label="Player is on loan"
            className="player__loan"
            title="On loan"
          >
            ⏳
          </div>
        ) : null}
      </div>
      <div className="player__position">{player.position}</div>
      <div className="player__team">{player.team}</div>
      {children && <div className="player__actions">{children}</div>}
      {chemistry !== 0 ? (
        <div className="player__chemistry" data-gkp-chemistry={player.position === 'GKP'}>
          {[...Array(chemistry).keys()].map(() => "★").join("")}
        </div>
      ) : null}
      {player.captain ? (
        <div aria-label="Team captain" className="player__captain">
          C
        </div>
      ) : null}
    </div>
  );
}
