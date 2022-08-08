import type { GamePlayer } from "~/domain/players.server";

export const MAX_TEAMS = 6;
export const MIN_TEAMS = 2;
export const MAX_SQUAD_SIZE = 23;

export async function calculateScoreForTeam(players: GamePlayer[]) {
  return players.reduce((acc, x) => acc + x.stars, 0);
}

export function updatePlayersBasedOnFormData(
  players: GamePlayer[],
  formData: FormData
) {
  const position = formData.get("position");
  const playerId = formData.get("player-id");
  const existingPlayerId = formData.get("existing-player-id");
  const player = players.find((x) => playerId === x.id);
  if (player?.lineupPosition === parseInt(position as string, 10)) {
    return;
  }
  const existingPosition = player?.lineupPosition;
  players.forEach((x) => {
    if (x.id === playerId && position) {
      x.lineupPosition = parseInt(position as string, 10);
    }
    if (x.id === existingPlayerId) {
      x.lineupPosition = existingPosition;
    }
  });
}
