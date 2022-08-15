import { createResult } from "~/domain/fixtures.server";
import type { Game } from "~/domain/games.server";
import type { RealTeam } from "~/domain/realTeam.server";
import { getRandomRealTeam } from "~/domain/realTeam.server";
import type { Team } from "~/domain/team.server";
import { Stage } from "./game";

export type Fixture = {
  homeTeam: Team;
  awayTeam: Team;
};

export type SimFixture = {
  team: Team;
  simTeam: RealTeam;
  isSim: true;
};

export async function createSeasonFixtures(teams: Team[], seasonId: string,
  game: Game,) {
  await Promise.all([
    createFixturesForStage(teams, seasonId, Stage.Match1, game),
    createFixturesForStage(teams, seasonId, Stage.Match2, game),
    createFixturesForStage(teams, seasonId, Stage.Match3, game),
    createFixturesForStage(teams, seasonId, Stage.Match4, game),
    createFixturesForStage(teams, seasonId, Stage.Match5, game),
  ]);
}

async function createFixturesForStage(
  teams: Team[],
  seasonId: string,
  stage: Stage,
  game: Game,
) {
  const sortedTeams = teams.sort((a, b) =>
    (a.id as string).localeCompare(b.id as string)
  );
  await Promise.all(
    getRealFixtures(sortedTeams, stage).map((x) =>
      createResult({
        seasonId: seasonId,
        stage: stage,
        homeTeamId: x.homeTeam.id,
        awayTeamId: x.awayTeam.id,
      })
    )
  );
  await Promise.all(
    sortedTeams
      .filter((x) => hasSim(x, sortedTeams, stage))
      .map((x) => createRandomSimMatch(x, seasonId, stage, game))
  );
}

async function createRandomSimMatch(
  team: Team,
  seasonId: string,
  stage: Stage,
  game: Game,
) {
  const opponent = await getRandomRealTeam(game.playerCollectionId);
  return await createResult({
    seasonId: seasonId,
    stage: stage,
    homeTeamId: team.id,
    realTeamId: opponent.id,
  });
}

export function getRealFixtures(teams: Team[], stage: Stage): Fixture[] {
  switch (teams.length) {
    case 1:
      return [];
    case 2:
      return getTwoPlayerFixtures(teams, stage);
    case 3:
      return getThreePlayerFixtures(teams, stage);
    case 4:
      return getFourPlayerFixtures(teams, stage);
    case 5:
      return getFivePlayerFixtures(teams, stage);
    case 6:
      return getSixPlayerFixtures(teams, stage);
    default:
      console.error("Incorrect number of teams " + teams.length);
      return [];
  }
}

function getTwoPlayerFixtures(teams: Team[], stage: Stage): Fixture[] {
  switch (stage) {
    case Stage.Match1:
    case Stage.Match3:
    case Stage.Match5:
      return [];
    case Stage.Match2:
      return [{ homeTeam: teams[0], awayTeam: teams[1] }];
    case Stage.Match4:
      return [{ homeTeam: teams[1], awayTeam: teams[0] }];
    default:
      console.error("Not a match day at stage " + stage);
      return [];
  }
}

function getThreePlayerFixtures(teams: Team[], stage: Stage): Fixture[] {
  switch (stage) {
    case Stage.Match2:
    case Stage.Match4:
      return [];
    case Stage.Match1:
      return [{ homeTeam: teams[0], awayTeam: teams[1] }];
    case Stage.Match3:
      return [{ homeTeam: teams[0], awayTeam: teams[2] }];
    case Stage.Match5:
      return [{ homeTeam: teams[1], awayTeam: teams[2] }];
    default:
      console.error("Not a match day at stage " + stage);
      return [];
  }
}

function getFourPlayerFixtures(teams: Team[], stage: Stage): Fixture[] {
  switch (stage) {
    case Stage.Match2:
    case Stage.Match4:
      return [];
    case Stage.Match1:
      return [
        { homeTeam: teams[0], awayTeam: teams[3] },
        { homeTeam: teams[1], awayTeam: teams[2] },
      ];
    case Stage.Match3:
      return [
        { homeTeam: teams[0], awayTeam: teams[2] },
        { homeTeam: teams[1], awayTeam: teams[3] },
      ];
    case Stage.Match5:
      return [
        { homeTeam: teams[0], awayTeam: teams[1] },
        { homeTeam: teams[2], awayTeam: teams[3] },
      ];
    default:
      console.error("Not a match day at stage " + stage);
      return [];
  }
}

function getFivePlayerFixtures(teams: Team[], stage: Stage): Fixture[] {
  switch (stage) {
    case Stage.Match1:
      return [
        { homeTeam: teams[0], awayTeam: teams[1] },
        { homeTeam: teams[2], awayTeam: teams[3] },
      ];
    case Stage.Match2:
      return [
        { homeTeam: teams[0], awayTeam: teams[2] },
        { homeTeam: teams[1], awayTeam: teams[4] },
      ];
    case Stage.Match3:
      return [
        { homeTeam: teams[0], awayTeam: teams[4] },
        { homeTeam: teams[1], awayTeam: teams[3] },
      ];
    case Stage.Match4:
      return [
        { homeTeam: teams[0], awayTeam: teams[3] },
        { homeTeam: teams[2], awayTeam: teams[4] },
      ];
    case Stage.Match5:
      return [
        { homeTeam: teams[1], awayTeam: teams[2] },
        { homeTeam: teams[3], awayTeam: teams[4] },
      ];
    default:
      console.error("Not a match day at stage " + stage);
      return [];
  }
}

function getSixPlayerFixtures(teams: Team[], stage: Stage): Fixture[] {
  switch (stage) {
    case Stage.Match1:
      return [
        { homeTeam: teams[0], awayTeam: teams[5] },
        { homeTeam: teams[1], awayTeam: teams[4] },
        { homeTeam: teams[2], awayTeam: teams[3] },
      ];
    case Stage.Match2:
      return [
        { homeTeam: teams[0], awayTeam: teams[4] },
        { homeTeam: teams[1], awayTeam: teams[3] },
        { homeTeam: teams[2], awayTeam: teams[5] },
      ];
    case Stage.Match3:
      return [
        { homeTeam: teams[0], awayTeam: teams[3] },
        { homeTeam: teams[1], awayTeam: teams[2] },
        { homeTeam: teams[4], awayTeam: teams[5] },
      ];
    case Stage.Match4:
      return [
        { homeTeam: teams[0], awayTeam: teams[2] },
        { homeTeam: teams[1], awayTeam: teams[5] },
        { homeTeam: teams[3], awayTeam: teams[4] },
      ];
    case Stage.Match5:
      return [
        { homeTeam: teams[0], awayTeam: teams[1] },
        { homeTeam: teams[2], awayTeam: teams[4] },
        { homeTeam: teams[3], awayTeam: teams[5] },
      ];
    default:
      console.error("Not a match day at stage " + stage);
      return [];
  }
}

export function hasSim(team: Team, teams: Team[], stage: Stage) {
  const teamIndex = teams.indexOf(team);
  switch (teams.length) {
    case 1:
      return true;
    case 2:
      return (
        stage === Stage.Match1 ||
        stage === Stage.Match3 ||
        stage === Stage.Match5
      );
    case 3:
      return (
        (stage === Stage.Match1 && teamIndex === 2) ||
        (stage === Stage.Match3 && teamIndex === 1) ||
        (stage === Stage.Match5 && teamIndex === 0) ||
        stage === Stage.Match2 ||
        stage === Stage.Match4
      );
    case 4:
      return stage === Stage.Match2 || stage === Stage.Match4;
    case 5:
      return (
        (stage === Stage.Match1 && teamIndex === 4) ||
        (stage === Stage.Match2 && teamIndex === 3) ||
        (stage === Stage.Match3 && teamIndex === 2) ||
        (stage === Stage.Match4 && teamIndex === 1) ||
        (stage === Stage.Match5 && teamIndex === 0)
      );
    case 6:
      return false;
    default:
      console.error("Incorrect number of teams " + teams.length);
      return false;
  }
}
