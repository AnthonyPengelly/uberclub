import { countFixturesPlayed } from "~/domain/fixtures.server";
import { createGameLog } from "~/domain/logs.server";
import {
  addPlayerToTeam,
  getLoanedPlayers,
  updateLoanee,
  updatePlayerLineupPosition,
  updatePlayerStars,
} from "~/domain/players.server";
import type { Season } from "~/domain/season.server";

export const LOAN_GAMES_REQUIRED_TO_IMPROVE = 2;

export async function returnLoans(gameId: string, season: Season) {
  await Promise.all(
    (
      await getLoanedPlayers(gameId)
    ).map(async (x) => {
      await updatePlayerLineupPosition(x.id, null, false);
      await addPlayerToTeam(x.id, x.loaneeId);
      await updateLoanee(x.id, null);
      const matchesPlayed = await countFixturesPlayed(x.id, season.id);

      if (x.potential > x.stars) {
        if (matchesPlayed >= LOAN_GAMES_REQUIRED_TO_IMPROVE) {
          await updatePlayerStars(x.id, x.stars + 1);
          await createGameLog(
            gameId,
            `${x.name} has returned to ${x.loanee} from ${x.loaner} and has gained 1 star from the experience.`
          );
        } else {
          await createGameLog(
            gameId,
            `${x.loanee} are furious that ${x.loaner} didn't give ${x.name} the game time they required to improve during their season-long loan.`
          );
        }
      } else {
        await createGameLog(
          gameId,
          `${x.name} has returned to ${x.loanee} from ${x.loaner}, but doesn't appear to have improved.`
        );
      }
    })
  );
}
