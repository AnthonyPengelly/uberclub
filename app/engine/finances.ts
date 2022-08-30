import { getResults } from "~/domain/fixtures.server";
import type { Game } from "~/domain/games.server";
import { getGame, recordWinner } from "~/domain/games.server";
import { createPointLeaderboardEntry } from "~/domain/leaderboard.server";
import { createGameLog } from "~/domain/logs.server";
import {
  getPlayer,
  getTeamPlayers,
  removePlayerFromTeam,
} from "~/domain/players.server";
import { getCurrentSeason, getTeamSeasons } from "~/domain/season.server";
import type { Team } from "~/domain/team.server";
import {
  getTeamById,
  updateCaptainBoost,
  updateCash,
} from "~/domain/team.server";
import type { PositionedTeamSeason } from "./leagueTable";
import { mapTeamSeasonsToPosition } from "./leagueTable";
import { getScoutPrice } from "./scouting";
import { calculateScoreForTeam } from "./team";

const ESTABLISHED_MIN = 40;
const MID_TABLE_MIN = 60;
const TITLE_CONTENDERS_MIN = 80;

export async function completeFinancesForAllTeams(gameId: string) {
  const game = await getGame(gameId);
  const season = await getCurrentSeason(gameId);
  const seasonAndResults = {
    season,
    teamSeasons: await getTeamSeasons(season.id),
    results: await getResults(season.id),
  };
  const positionedTeamSeasons = mapTeamSeasonsToPosition(seasonAndResults);
  await Promise.all(
    positionedTeamSeasons
      .sort((a, b) => b.position - a.position)
      .map((x) =>
        completeFinances(
          game,
          x,
          season.seasonNumber,
          seasonAndResults.teamSeasons.length
        )
      )
  );
}

async function completeFinances(
  game: Game,
  positionedTeamSeason: PositionedTeamSeason,
  seasonNumber: number,
  numberOfTeams: number
) {
  const team = await getTeamById(positionedTeamSeason.teamId);
  if (
    positionedTeamSeason.score >= game.victoryPoints &&
    positionedTeamSeason.position === 1
  ) {
    await createGameLog(
      game.id,
      `*** ${team.managerName} has expertly led ${team.teamName} to 100 points in 1 season! WE HAVE A WINNER! ***`
    );
    await recordWinner(game.id, team.teamName);
  }
  if (positionedTeamSeason.position === 1 && seasonNumber === 10) {
    await createPointLeaderboardEntry(
      game.name,
      team.teamName,
      team.managerName,
      positionedTeamSeason.score,
      numberOfTeams,
      `/games/${game.id}`
    );
  }
  const placementAward = 110 - 10 * positionedTeamSeason.position;
  const stadiumIncome = calculateStadiumIncome(
    team.stadiumLevel,
    positionedTeamSeason.score
  );
  const captainBoost = positionedTeamSeason.position;
  await createGameLog(
    game.id,
    `${positionedTeamSeason.teamName} finish the season in position: ${positionedTeamSeason.position} and gain ${placementAward}M plus ${stadiumIncome}M from stadium income.` +
      `This season they will play with a captain boost of +${captainBoost}`
  );
  const players = await getTeamPlayers(positionedTeamSeason.teamId);
  const wages = await calculateScoreForTeam(players);
  await createGameLog(
    game.id,
    `${positionedTeamSeason.teamName} find ${wages}M to dish out for wages`
  );
  const total = team.cash + stadiumIncome + placementAward - wages;
  await updateCash(team.id, total);
  await updateCaptainBoost(team.id, captainBoost);
}

function calculateStadiumIncome(level: number, score: number) {
  if (score >= TITLE_CONTENDERS_MIN) {
    if (level === 4) {
      return 150;
    }
    return 25 + level * 25;
  }
  if (score >= MID_TABLE_MIN) {
    if (level === 4) {
      return 100;
    }
    return 20 + level * 20;
  }
  if (score >= ESTABLISHED_MIN) {
    if (level === 4) {
      return 75;
    }
    return 15 + level * 15;
  }
  return 10 + level * 10;
}

export async function sellPlayer(gameId: string, playerId: string, team: Team) {
  const player = await getPlayer(playerId);
  if (player.loan) {
    throw new Response("Bad Request", {
      status: 400,
      statusText: "Can't sell players on loan",
    });
  }
  const cost = getScoutPrice(player.stars, player.potential);
  await createGameLog(
    gameId,
    `${team.teamName} have sold ${player.name} for ${cost}M`
  );
  await removePlayerFromTeam(playerId);
  await updateCash(team.id, team.cash + cost);
}
