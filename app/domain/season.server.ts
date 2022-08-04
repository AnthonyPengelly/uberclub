import { supabase } from "./supabase.server";

export type Season = {
  id: string;
  name: string;
  seasonNumber: number;
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
