import type { GamePlayer } from "~/domain/players.server";

export async function calculateScoreForTeam(players: GamePlayer[]) {
  return players.reduce((acc, x) => acc + x.stars, 0);
}
