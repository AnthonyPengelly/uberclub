import type { ResultSummary } from "~/domain/fixtures.server";
import type { Season, TeamSeasonSummary } from "~/domain/season.server";

export type PositionedTeamSeason = {
  position: number;
} & TeamSeasonSummary;

export type SeasonAndResults = {
  season: Season;
  teamSeasons: TeamSeasonSummary[];
  results: ResultSummary[];
};

export function mapTeamSeasonsToPosition(
  seasonAndResults: SeasonAndResults
): PositionedTeamSeason[] {
  return seasonAndResults.teamSeasons
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }
      const headToHead = seasonAndResults.results.find(
        (x) =>
          (x.homeTeamId === a.teamId && x.awayTeamId === b.teamId) ||
          (x.homeTeamId === b.teamId && x.awayTeamId === a.teamId)
      );
      if (headToHead && headToHead.winningTeamId) {
        return headToHead.winningTeamId === b.teamId ? 1 : -1;
      }
      if (a.startingScore !== b.startingScore) {
        return a.startingScore - b.startingScore;
      }
      if (headToHead && headToHead.draw) {
        const home =
          headToHead.homeDef! + headToHead.homeMid! + headToHead.homeFwd!;
        const away =
          headToHead.awayDef! + headToHead.awayMid! + headToHead.awayFwd!;
        if (home !== away) {
          return headToHead.homeTeamId === a.teamId ? away - home : home - away;
        }
      }
      // Fallback to the season specific id, so at least it isn't the same each year
      return b.id.localeCompare(a.id);
    })
    .map((x, i) => ({ position: i + 1, ...x }));
}

export function orderTeamsInSeason(teamSeasons: PositionedTeamSeason[]) {
  return teamSeasons
    .sort((a, b) => b.id.localeCompare(a.id))
    .sort((a, b) => a.startingScore - b.startingScore)
    .sort((a, b) => a.position - b.position);
}
