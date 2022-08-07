import type { GamePlayer } from "~/domain/players.server";

export default function PlayerDisplay({ player }: { player: GamePlayer }) {
  return (
    <>
      <img src={player.imageUrl} alt={player.name} width={40} height={40} />[
      {player.position}] {player.name}{" "}
      {[...Array(player.stars).keys()].map(() => "★").join("")}
      {[...Array(player.potential - player.stars).keys()]
        .map(() => "☆")
        .join("")}
      <br />
      {player.team}
      <br />
    </>
  );
}
