import type { Game } from "~/domain/games.server";
import { addPlayerGameStates, getPlayersList } from "~/domain/players.server";

export async function addAllPlayersToGame(game: Game) {
  const allPlayers = await getPlayersList(game.playerCollectionId);
  const gamePlayers = allPlayers.map((x) => ({
    playerId: x.id,
    gameId: game.id,
    stars: x.overall,
  }));
  return await addPlayerGameStates(gamePlayers);
}
