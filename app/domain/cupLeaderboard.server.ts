import { supabase } from "./supabase.server";

export type CupLeaderboardEntry = {
  id: string;
  game: string;
  teamName: string;
  managerName: string;
  season: number;
  seasonPoints: number;
  numberOfTeams: number;
  fixtureUrl: string;
};

export async function createCupLeaderboardEntry(
  game: string,
  teamName: string,
  managerName: string,
  season: number,
  seasonPoints: number,
  numberOfTeams: number,
  fixtureUrl: string
) {
  const { data, error } = await supabase
    .from("cup_leaderboard_entries")
    .insert([
      {
        game,
        team_name: teamName,
        manager_name: managerName,
        season,
        season_points: seasonPoints,
        number_of_teams: numberOfTeams,
        fixture_url: fixtureUrl,
      },
    ])
    .single();

  if (!error) {
    return data?.id;
  }

  return null;
}

export async function getCupLeaderboard(): Promise<CupLeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("cup_leaderboard_entries")
    .select("*");

  if (error) {
    throw error;
  }
  return data?.map((x) => ({
    id: x.id,
    game: x.game,
    teamName: x.team_name,
    managerName: x.manager_name,
    season: x.season,
    seasonPoints: x.season_points,
    numberOfTeams: x.number_of_teams,
    fixtureUrl: x.fixture_url,
  }));
}
