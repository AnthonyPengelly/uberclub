import type { GamePlayer } from "~/domain/players.server";
import { updatePlayerLineupPosition } from "~/domain/players.server";
import { getPlayer } from "~/domain/players.server";

export const MAX_DEF_POSITION = 6;
export const MAX_MID_POSITION = 11;
export const MAX_FWD_POSITION = 15;

export type LineupPlayer = GamePlayer & { lineupPosition: number };

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
  const existingPlayer =
    existingPlayerId && (await getPlayer(existingPlayerId));
  if (playerId && playerId !== "null") {
    const player = await getPlayer(playerId);
    await updatePlayerLineupPosition(player.id, player.lineupPosition, true);
  }
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
  const playersInLineup = players.filter(
    (x) => x.lineupPosition
  ) as LineupPlayer[];
  playersInLineup
    .filter((x) => x.lineupPosition <= MAX_DEF_POSITION)
    .forEach((x) => {
      const position = x.lineupPosition === 1 ? "GKP" : "DEF";
      const previousPlayer = findPlayerInPosition(
        playersInLineup,
        x.lineupPosition - 1
      );
      scores.DEF += playerScore(x, position, captainBoost, previousPlayer);
    });
  playersInLineup
    .filter(
      (x) =>
        x.lineupPosition > MAX_DEF_POSITION &&
        x.lineupPosition <= MAX_MID_POSITION
    )
    .forEach((x) => {
      const previousPlayer = findPlayerInPosition(
        playersInLineup,
        x.lineupPosition - 1
      );
      scores.MID += playerScore(x, "MID", captainBoost, previousPlayer);
    });
  playersInLineup
    .filter((x) => x.lineupPosition > MAX_MID_POSITION)
    .forEach((x) => {
      const previousPlayer = findPlayerInPosition(
        playersInLineup,
        x.lineupPosition - 1
      );
      scores.FWD += playerScore(x, "FWD", captainBoost, previousPlayer);
    });
  return scores;
}

function playerScore(
  player: LineupPlayer,
  position: "GKP" | "DEF" | "MID" | "FWD",
  captainBoost: number,
  previousPlayer: LineupPlayer | undefined
) {
  const captainBonus = player.captain ? captainBoost : 0;
  const penalty = positionPenalty(player, position);
  const score = player.stars + captainBonus - penalty;
  return hasChemistry(player, previousPlayer) ? score + 1 : score;
}

export function hasChemistry(
  player: LineupPlayer,
  previousPlayer: LineupPlayer | undefined
) {
  if (player.lineupPosition === 1 || !previousPlayer) {
    return false;
  }
  // Don't add chemistry between different lines in the formation
  if (
    previousPlayer.lineupPosition === 1 ||
    previousPlayer.lineupPosition === MAX_DEF_POSITION ||
    previousPlayer.lineupPosition === MAX_MID_POSITION
  ) {
    return false;
  }
  return player.team === previousPlayer.team;
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

export function findPlayerInPosition(
  players: GamePlayer[],
  position: number
): LineupPlayer | undefined {
  return players.find((x) => x.lineupPosition === position) as
    | LineupPlayer
    | undefined;
}
