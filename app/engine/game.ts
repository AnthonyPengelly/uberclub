import type { Game } from "~/domain/games.server";
import { addTeamToGame, getTeamsInGame } from "~/domain/games.server";

export function isOpenForPlayers(game: Game) {
  return game.stage === 0;
}

export async function joinGame(teamInput: {
  userId: string;
  gameId: string;
  teamName: string;
  managerName: string;
}) {
  await addTeamToGame(teamInput);
  const allTeams = await getTeamsInGame(teamInput.gameId);
  if (allTeams.length === 4) {
    // await startGame(teamInput.gameId);
  }
}
