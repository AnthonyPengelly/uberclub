import type { GamePlayer } from "~/domain/players.server";
import { updatePlayerLineupPosition } from "~/domain/players.server";
import { getPlayer } from "~/domain/players.server";

export const MAX_DEF_POSITION = 6;
export const MAX_MID_POSITION = 11;
export const MAX_FWD_POSITION = 15;

export async function addPlayerToLineup(
  playerId: string,
  position: number,
  existingPlayerId: string
) {
  const player = await getPlayer(playerId);
  const existingPlayer =
    existingPlayerId && (await getPlayer(existingPlayerId));
  const existingPosition = player.lineupPosition;
  await updatePlayerLineupPosition(player.id, position, player.captain);
  if (existingPlayer) {
    await updatePlayerLineupPosition(
      existingPlayer.id,
      existingPosition,
      existingPosition ? existingPlayer.captain : false
    );
  }
}

export async function updateCaptain(
  playerId: string,
  existingPlayerId: string
) {
  const player = await getPlayer(playerId);
  const existingPlayer =
    existingPlayerId && (await getPlayer(existingPlayerId));
  await updatePlayerLineupPosition(player.id, player.lineupPosition, true);
  if (existingPlayer) {
    await updatePlayerLineupPosition(
      existingPlayer.id,
      existingPlayer.lineupPosition,
      false
    );
  }
}

export async function removePlayerFromLineup(playerId: string) {
  if (!playerId) {
    return;
  }
  await updatePlayerLineupPosition(playerId, undefined, false);
}

export function getLineupScores(players: GamePlayer[], captainBoost: number) {
  const scores = {
    DEF: 0,
    MID: 0,
    FWD: 0,
  };
  players
    .filter((x) => x.lineupPosition)
    .forEach((x) => {
      const captainBonus = x.captain ? captainBoost : 0;
      if (x.lineupPosition! <= MAX_DEF_POSITION) {
        const position = x.lineupPosition === 1 ? "GKP" : "DEF";
        const penalty = positionPenalty(x, position);
        scores.DEF += x.stars + captainBonus - penalty;
        return;
      }
      if (x.lineupPosition! <= MAX_MID_POSITION) {
        const penalty = positionPenalty(x, "MID");
        scores.MID += x.stars + captainBonus - penalty;
        return;
      }
      if (x.lineupPosition! <= MAX_FWD_POSITION) {
        const penalty = positionPenalty(x, "FWD");
        scores.FWD += x.stars + captainBonus - penalty;
        return;
      }
    });
  return scores;
}

function positionPenalty(
  player: GamePlayer,
  position: "GKP" | "DEF" | "MID" | "FWD"
) {
  if (player.position === "GKP" && position !== "GKP") {
    return player.stars - 1;
  }
  switch (position) {
    case "GKP":
      return player.position === "GKP" ? 0 : player.stars - 1;
    case "DEF":
      if (player.position === "FWD") {
        return 2;
      }
      if (player.position === "MID") {
        return 1;
      }
      return 0;
    case "MID":
      if (player.position === "FWD") {
        return 1;
      }
      if (player.position === "MID") {
        return 0;
      }
      return 1;
    case "FWD":
      if (player.position === "FWD") {
        return 0;
      }
      if (player.position === "MID") {
        return 1;
      }
      return 2;
  }
}

export function validateLineup(players: GamePlayer[]) {
  const lineup = players.filter((x) => x.lineupPosition) as (GamePlayer & {
    lineupPosition: number;
  })[];
  if (lineup.length < 11) {
    return "Not enough players";
  }
  if (lineup.length > 11) {
    return "Too many players";
  }
  if (!lineup.find((x) => x.lineupPosition === 1)) {
    return "No Goalkeeper selected";
  }
  const defenders = lineup.filter(
    (x) => x.lineupPosition > 1 && x.lineupPosition <= MAX_DEF_POSITION
  );
  if (defenders.length < 3) {
    return "Not enough Defenders";
  }
  const midfielders = lineup.filter(
    (x) =>
      x.lineupPosition > MAX_DEF_POSITION &&
      x.lineupPosition <= MAX_MID_POSITION
  );
  if (midfielders.length < 3) {
    return "Not enough Midfielders";
  }
  const forwards = lineup.filter(
    (x) =>
      x.lineupPosition > MAX_MID_POSITION &&
      x.lineupPosition <= MAX_FWD_POSITION
  );
  if (forwards.length < 2) {
    return "Not enough Forwards";
  }
}
