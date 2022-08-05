import { supabase } from "./supabase.server";

export type Season = {
  id: string;
  name: string;
  seasonNumber: number;
};

export type TeamSeason = {
  id: string;
  score: number;
  startingScore: number;
};

export async function createSeason(gameId: string, seasonNumber: number) {
  const { data, error } = await supabase
    .from("seasons")
    .insert([
      { game_id: gameId, name: `Season ${seasonNumber}`, season: seasonNumber },
    ])
    .single();

  if (!error) {
    return data;
  }

  return null;
}

export async function getCurrentSeason(gameId: string): Promise<Season> {
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("game_id", gameId)
    .order("season", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    throw error;
  }
  return {
    id: data.id,
    name: data.name,
    seasonNumber: data.season,
  };
}

export async function createTeamSeason(
  seasonId: string,
  teamId: string,
  startingScore: number
) {
  const { data, error } = await supabase
    .from("team_seasons")
    .insert([
      {
        season_id: seasonId,
        team_id: teamId,
        score: startingScore,
        starting_score: startingScore,
      },
    ])
    .single();

  if (!error) {
    return data;
  }

  return null;
}

export async function getTeamSeason(
  seasonId: string,
  teamId: string
): Promise<TeamSeason> {
  const { data, error } = await supabase
    .from("team_seasons")
    .select("*")
    .eq("season_id", seasonId)
    .eq("team_id", teamId)
    .single();

  if (error) {
    throw error;
  }
  return {
    id: data.id,
    score: data.score,
    startingScore: data.starting_score,
  };
}

export async function updateScoreOnTeamSeason(id: string, score: number) {
  const { error } = await supabase
    .from("team_seasons")
    .update({ score: score })
    .eq("id", id);

  if (error) {
    throw error;
  }
}
