import type { GamePlayerSummary } from "~/domain/players.server";
import { addPlayerToTeam } from "~/domain/players.server";
import { getPlayersForDraft } from "~/domain/players.server";

// 30* squad strength
// 1 4*
// 3 3*
// 5 2*
// 7 1*
const FOUR_STAR_PLAYERS = 1;
const THREE_STAR_PLAYERS = 3;
const TWO_STAR_PLAYERS = 5;

const positionLimits = {
  GKP: 2,
  DEF: 5,
  MID: 5,
  FWD: 4,
} as { [index: string]: number };

export async function performDraft(gameId: string, teamIds: string[]) {
  const teamMap = teamIds.map((x) => ({
    teamId: x,
    players: [] as GamePlayerSummary[],
  }));
  const players = await getPlayersForDraft(gameId);
  const fourStars = players
    .filter((x) => x.overall === 4)
    .sort(() => 0.5 - Math.random())
    .slice(0, FOUR_STAR_PLAYERS * teamIds.length);
  const threeStars = players
    .filter((x) => x.overall === 3)
    .sort(() => 0.5 - Math.random())
    .slice(0, THREE_STAR_PLAYERS * teamIds.length);
  const twoStars = players
    .filter((x) => x.overall === 2)
    .sort(() => 0.5 - Math.random())
    .slice(0, TWO_STAR_PLAYERS * teamIds.length);
  const oneStars = players
    .filter((x) => x.overall === 1)
    .sort(() => 0.5 - Math.random());

  const oneStarPlayersEach = Math.floor(oneStars.length / teamIds.length);

  await Promise.all(
    teamMap.map((x, i) => {
      assignToTeam(
        x,
        fourStars.slice(FOUR_STAR_PLAYERS * i, FOUR_STAR_PLAYERS * (i + 1))
      );
      assignToTeam(
        x,
        threeStars.slice(THREE_STAR_PLAYERS * i, THREE_STAR_PLAYERS * (i + 1))
      );
      assignToTeam(
        x,
        twoStars.slice(TWO_STAR_PLAYERS * i, TWO_STAR_PLAYERS * (i + 1))
      );
      fillSpaces(
        x,
        oneStars.slice(oneStarPlayersEach * i, oneStarPlayersEach * (i + 1))
      );
      return Promise.all(
        x.players.map((player) => addPlayerToTeam(player.id, x.teamId))
      );
    })
  );
}

function assignToTeam(
  team: { teamId: string; players: GamePlayerSummary[] },
  players: GamePlayerSummary[]
) {
  players.forEach((x) => {
    if (
      team.players.filter((y) => y.position === x.position).length <
      positionLimits[x.position]
    ) {
      team.players.push(x);
    }
  });
}

function fillSpaces(
  team: { teamId: string; players: GamePlayerSummary[] },
  players: GamePlayerSummary[]
) {
  const goalkeepers = players.filter((x) => x.position === "GKP");
  const goalkeepersRequired =
    positionLimits.GKP -
    team.players.filter((y) => y.position === "GKP").length;
  team.players = [
    ...team.players,
    ...goalkeepers.slice(0, goalkeepersRequired),
  ];

  const defenders = players.filter((x) => x.position === "DEF");
  const defendersRequired =
    positionLimits.DEF -
    team.players.filter((y) => y.position === "DEF").length;
  team.players = [...team.players, ...defenders.slice(0, defendersRequired)];

  const midfielders = players.filter((x) => x.position === "MID");
  const midfieldersRequired =
    positionLimits.MID -
    team.players.filter((y) => y.position === "MID").length;
  team.players = [
    ...team.players,
    ...midfielders.slice(0, midfieldersRequired),
  ];

  const forwards = players.filter((x) => x.position === "FWD");
  const forwardsRequired =
    positionLimits.FWD -
    team.players.filter((y) => y.position === "FWD").length;
  team.players = [...team.players, ...forwards.slice(0, forwardsRequired)];

  const spaceRemaining = 16 - team.players.length;
  team.players = [
    ...team.players,
    ...players
      .filter((x) => !team.players.includes(x))
      .slice(0, spaceRemaining),
  ];
}
