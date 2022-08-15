import type { Game } from "~/domain/games.server";
import { getGame, recordWinner } from "~/domain/games.server";
import { createGameLog } from "~/domain/logs.server";
import {
  getPlayer,
  getTeamPlayers,
  removePlayerFromTeam,
} from "~/domain/players.server";
import type { TeamSeasonSummary } from "~/domain/season.server";
import { getCurrentSeason, getTeamSeasons } from "~/domain/season.server";
import type { Team } from "~/domain/team.server";
import {
  getTeamById,
  updateCaptainBoost,
  updateCash,
} from "~/domain/team.server";
import { getScoutPrice } from "./scouting";
import { calculateScoreForTeam } from "./team";

const ESTABLISHED_MIN = 40;
const MID_TABLE_MIN = 60;
const TITLE_CONTENDERS_MIN = 80;

export async function completeFinancesForAllTeams(gameId: string) {
  const season = await getCurrentSeason(gameId);
  const teamSeasons = await getTeamSeasons(season.id);
  const game = await getGame(gameId);
  await Promise.all(
    teamSeasons
      .sort((a, b) => b.score - a.score)
      .map((x, i) => completeFinances(game, x, i + 1))
  );
}

async function completeFinances(
  game: Game,
  teamSeason: TeamSeasonSummary,
  position: number
) {
  const team = await getTeamById(teamSeason.teamId);
  if (teamSeason.score >= game.victoryPoints && position === 1) {
    await createGameLog(
      game.id,
      `*** ${team.managerName} has expertly led ${team.teamName} to 100 points in 1 season! WE HAVE A WINNER! ***`
    );
    await recordWinner(game.id, team.teamName);
  }
  const placementAward = 110 - 10 * position;
  const stadiumIncome = calculateStadiumIncome(
    team.stadiumLevel,
    teamSeason.score
  );
  const captainBoost = position;
  await createGameLog(
    game.id,
    `${teamSeason.teamName} finish the season in position: ${position} and gain ${placementAward}M plus ${stadiumIncome}M from stadium income.` +
      `This season they will play with a captain boost of +${captainBoost}`
  );
  const players = await getTeamPlayers(teamSeason.teamId);
  const wages = await calculateScoreForTeam(players);
  await createGameLog(
    game.id,
    `${teamSeason.teamName} find ${wages}M to dish out for wages`
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
  const cost = getScoutPrice(player.stars, player.potential);
  await createGameLog(
    gameId,
    `${team.teamName} have sold ${player.name} for ${cost}M`
  );
  await removePlayerFromTeam(playerId);
  await updateCash(team.id, team.cash + cost);
}
