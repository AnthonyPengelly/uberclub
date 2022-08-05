import { updatePlayerLineupPosition } from "~/domain/players.server";
import { getPlayer } from "~/domain/players.server";

export async function addPlayerToLineup(
  playerId: string,
  position: number,
  existingPlayerId: string
) {
  const player = await getPlayer(playerId);
  const existingPlayer =
    existingPlayerId && (await getPlayer(existingPlayerId));
  const existingPosition = player.lineupPosition;
  await updatePlayerLineupPosition(player.id, position);
  if (existingPlayer) {
    await updatePlayerLineupPosition(existingPlayer.id, existingPosition);
  }
}

export async function removePlayerFromLineup(playerId: string) {
  if (!playerId) {
    return;
  }
  await updatePlayerLineupPosition(playerId, undefined);
}
