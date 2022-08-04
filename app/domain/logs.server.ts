import { supabase } from "./supabase.server";

export async function createTrainingLog(
  seasonId: string,
  teamId: string,
  improvement: number
) {
  const { data, error } = await supabase
    .from("training_logs")
    .insert([{ season_id: seasonId, team_id: teamId, result: improvement }])
    .single();

  if (!error) {
    return data;
  }

  return null;
}

export async function getTrainingLogsForSeason(
  seasonId: string,
  teamId: string
) {
  const { data, error } = await supabase
    .from("training_logs")
    .select(`id`)
    .eq("season_id", seasonId)
    .eq("team_id", teamId);
  if (error) {
    throw error;
  }
  return data || [];
}

export async function createScoutingLog(
  seasonId: string,
  teamId: string,
  playerId: string
) {
  const { data, error } = await supabase
    .from("scouting_logs")
    .insert([
      { season_id: seasonId, team_id: teamId, player_game_state_id: playerId },
    ])
    .single();

  if (!error) {
    return data;
  }

  return null;
}

export async function getScoutingLogsForSeason(
  seasonId: string,
  teamId: string
) {
  const { data, error } = await supabase
    .from("scouting_logs")
    .select("player_game_state_id")
    .eq("season_id", seasonId)
    .eq("team_id", teamId);
  if (error) {
    throw error;
  }
  return data.map((x) => x.player_game_state_id) || [];
}

export async function createImprovementLog(
  seasonId: string,
  teamId: string,
  improvement: number
) {
  const { data, error } = await supabase
    .from("improvement_logs")
    .insert([{ season_id: seasonId, team_id: teamId }])
    .single();

  if (!error) {
    return data;
  }

  return null;
}
