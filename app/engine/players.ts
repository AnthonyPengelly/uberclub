import { countBidsCommitted } from "~/domain/deadlineDay.server";
import type { Game } from "~/domain/games.server";
import {
  addPlayerGameStates,
  countTeamPlayers,
  getPlayersList,
} from "~/domain/players.server";
import { getCurrentSeason } from "~/domain/season.server";
import type { Team } from "~/domain/team.server";
import { getTransferBidsForTeam } from "~/domain/transferBids.server";
import { Status } from "./transfers";

export async function addAllPlayersToGame(game: Game) {
  const allPlayers = await getPlayersList(game.playerCollectionId);
  const gamePlayers = allPlayers.map((x) => ({
    playerId: x.id,
    gameId: game.id,
    stars: x.overall,
  }));
  return await addPlayerGameStates(gamePlayers);
}

export async function getSquadSize(team: Team) {
  const season = await getCurrentSeason(team.gameId);
  const squadSize = await countTeamPlayers(team.id);
  const deadlineDayBidsCommitted = await countBidsCommitted(team.id, season.id);
  const transfersCommitted = await (
    await getTransferBidsForTeam(team.id)
  )
    .filter((x) => x.status === Status.Pending)
    .filter((x) => x.buyingTeamId === team.id)
    .map(
      (x) =>
        x.players.filter((y) => !y.buyingTeam).length -
        x.players.filter((y) => y.buyingTeam).length
    )
    .filter((x) => x > 0)
    .reduce((acc, x) => x + acc, 0);

  return {
    squadSize: squadSize,
    committedSize: squadSize + transfersCommitted + deadlineDayBidsCommitted,
  };
}
