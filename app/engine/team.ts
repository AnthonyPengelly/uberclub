import type { GamePlayer } from "~/domain/players.server";

export const MAX_TEAMS = 6;
export const MIN_TEAMS = 1;
export const MAX_SQUAD_SIZE = 23;

export async function calculateScoreForTeam(players: GamePlayer[]) {
  return players.reduce((acc, x) => acc + x.stars, 0);
}

export function updatePlayersBasedOnFormData(
  players: GamePlayer[],
  formData: FormData
) {
  const player1Id = formData.get("player1-id");
  const position1 = formData.get("position1");
  const player2Id = formData.get("player2-id");
  const position2 = formData.get("position2");
  if (player1Id) {
    const position = position2 ? parseInt(position2 as string, 10) : undefined;
    setPlayerIdToPosition(player1Id as string, position, players);
  }
  if (player2Id) {
    const position = position1 ? parseInt(position1 as string, 10) : undefined;
    setPlayerIdToPosition(player2Id as string, position, players);
  }
}

function setPlayerIdToPosition(
  id: string,
  position: number | undefined,
  players: GamePlayer[]
) {
  const player = players.find((x) => id === x.id);
  if (player) {
    player.lineupPosition = position || null;
    if (!position) {
      player.captain = false;
    }
  }
}
