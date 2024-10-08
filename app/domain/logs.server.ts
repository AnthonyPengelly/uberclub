import { supabase } from "./supabase.server";

export type GameLog = {
  id: string;
  createdAt: string;
  event: string;
};

export async function createTrainingLog(
  seasonId: string,
  teamId: string,
  improvement: number
) {
  const { data, error } = await supabase
    .from("training_logs")
    .insert([{ season_id: seasonId, team_id: teamId, result: improvement }])
    .select();

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
    .select();

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

export async function createImprovementLog(seasonId: string, teamId: string) {
  const { data, error } = await supabase
    .from("improvement_logs")
    .insert([{ season_id: seasonId, team_id: teamId }])
    .select();

  if (!error) {
    return data;
  }

  return null;
}

export async function getImprovementLogsForSeason(
  seasonId: string,
  teamId: string
) {
  const { data, error } = await supabase
    .from("improvement_logs")
    .select("id")
    .eq("season_id", seasonId)
    .eq("team_id", teamId);
  if (error) {
    throw error;
  }
  return data.map((x) => x.id) || [];
}

export async function createGameLog(gameId: string, event: string) {
  const { data, error } = await supabase
    .from("game_logs")
    .insert([{ game_id: gameId, event }])
    .select();

  if (!error) {
    return data;
  }

  return null;
}

export async function getGameLogs(gameId: string): Promise<GameLog[]> {
  const { data, error } = await supabase
    .from("game_logs")
    .select("id, created_at, event")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return (
    data.map((x) => ({
      id: x.id,
      createdAt: x.created_at,
      event: x.event,
    })) || []
  );
}
