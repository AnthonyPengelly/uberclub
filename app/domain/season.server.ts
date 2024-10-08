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
  teamId: string;
};

export type TeamSeasonSummary = TeamSeason & {
  teamName: string;
  gameId: string;
  season: number;
};

export async function createSeason(gameId: string, seasonNumber: number) {
  const { data, error } = await supabase
    .from("seasons")
    .insert([
      { game_id: gameId, name: `Season ${seasonNumber}`, season: seasonNumber },
    ])
    .select();

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

export async function getAllSeasons(gameId: string): Promise<Season[]> {
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .eq("game_id", gameId)
    .order("season", { ascending: false });

  if (error) {
    throw error;
  }
  return data?.map((x) => ({
    id: x.id,
    name: x.name,
    seasonNumber: x.season,
  }));
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
    .select();

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
    teamId: data.team_id,
  };
}

export async function getTeamSeasons(
  seasonId: string
): Promise<TeamSeasonSummary[]> {
  const { data, error } = await supabase
    .from("team_seasons")
    .select(
      "id, score, starting_score, team_id, teams (team_name, game_id), seasons (season)"
    )
    .eq("season_id", seasonId);

  if (error) {
    throw error;
  }
  return data.map((x) => ({
    id: x.id,
    score: x.score,
    startingScore: x.starting_score,
    teamName: x.teams.team_name,
    teamId: x.team_id,
    gameId: x.teams.game_id,
    season: x.seasons.season,
  }));
}

export async function getTopTeamSeasonsEver(): Promise<TeamSeasonSummary[]> {
  const { data, error } = await supabase
    .from("team_seasons")
    .select(
      "id, score, starting_score, team_id, teams (team_name, game_id), seasons (season)"
    )
    .order("starting_score", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }
  const seasons = data.map((x) => ({
    id: x.id,
    score: x.score,
    startingScore: x.starting_score,
    teamName: x.teams.team_name,
    teamId: x.team_id,
    gameId: x.teams.game_id,
    season: x.seasons.season,
  }));
  const seasonsForUniqueTeams: TeamSeasonSummary[] = [];
  const map = new Map();
  seasons.forEach((season) => {
    if (!map.has(season.teamId)) {
      map.set(season.teamId, true);
      seasonsForUniqueTeams.push(season);
    }
  });
  return seasonsForUniqueTeams.slice(0, 10);
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
