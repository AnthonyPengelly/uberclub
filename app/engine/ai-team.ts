import type { GamePlayer } from "~/domain/players.server";
import {
  MAX_DEF_POSITION,
  MAX_MID_POSITION,
  MIN_DEFENDERS,
  MIN_FORWARDS,
  MIN_MIDFIELDERS,
} from "./lineup";

export function getPlayersWithAiPositions(players: GamePlayer[]) {
  // Clear positions that other teams may have set
  players.forEach((x) => {
    x.lineupPosition = undefined;
    x.captain = false;
  });
  const orderedPlayers = players.filter(x => !x.injured).sort((a, b) => b.stars - a.stars);
  orderedPlayers[0].captain = true;

  const goalkeeper = orderedPlayers.find((x) => x.position === "GKP");
  if (goalkeeper) {
    goalkeeper.lineupPosition = 1;
  }
  const baseDefenders = orderedPlayers
    .filter((x) => x.position === "DEF")
    .slice(0, MIN_DEFENDERS);
  baseDefenders.forEach((x, i) => {
    x.lineupPosition = i + 2;
  });
  const baseMidfielders = orderedPlayers
    .filter((x) => x.position === "MID")
    .slice(0, MIN_MIDFIELDERS);
  baseMidfielders.forEach((x, i) => {
    x.lineupPosition = i + MAX_DEF_POSITION + 1;
  });
  const baseForwards = orderedPlayers
    .filter((x) => x.position === "FWD")
    .slice(0, MIN_FORWARDS);
  baseForwards.forEach((x, i) => {
    x.lineupPosition = i + MAX_MID_POSITION + 1;
  });
  // Add the best 2 that haven't been added yet
  orderedPlayers
    .filter((x) => x.position !== "GKP")
    .filter((x) => !x.lineupPosition)
    .slice(0, 2)
    .forEach((x) => {
      const maxPosition = Math.max(
        ...orderedPlayers
          .filter((y) => x.position === y.position)
          .map((y) => y.lineupPosition || 0)
      );
      x.lineupPosition = maxPosition + 1;
    });
  return orderedPlayers;
}
