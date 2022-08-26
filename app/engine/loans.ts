import { createGameLog } from "~/domain/logs.server";
import {
  addPlayerToTeam,
  getLoanedPlayers,
  updateLoanee,
  updatePlayerLineupPosition,
  updatePlayerStars,
} from "~/domain/players.server";

export async function returnLoans(gameId: string) {
  await Promise.all(
    (
      await getLoanedPlayers(gameId)
    ).map(async (x) => {
      await updatePlayerLineupPosition(x.id, null, false);
      await addPlayerToTeam(x.id, x.loaneeId);
      await updateLoanee(x.id, null);
      if (x.potential > x.stars) {
        await updatePlayerStars(x.id, x.stars + 1);
        await createGameLog(
          gameId,
          `${x.name} has returned to ${x.loanee} from ${x.loaner} and has gained 1 star from the experience.`
        );
      } else {
        await createGameLog(
          gameId,
          `${x.name} has returned to ${x.loanee} from ${x.loaner}, but doesn't appear to have improved.`
        );
      }
    })
  );
}
