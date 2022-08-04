import { addPlayerGameStates, getPlayersList } from "~/domain/players.server";

export async function addAllPlayersToGame(gameId: string) {
  const allPlayers = await getPlayersList();
  const gamePlayers = allPlayers.map((x) => ({
    playerId: x.id,
    gameId,
    stars: x.overall,
  }));
  return await addPlayerGameStates(gamePlayers);
}
