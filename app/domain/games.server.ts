import { supabase } from "./supabase.server";

export type Game = {
  id: string;
  name: string;
  stage: number;
};

export async function getGamesList(): Promise<Game[]> {
  const { data } = await supabase.from("games").select("id, name, stage");
  return data || [];
}

export async function getGame(id: string): Promise<Game> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (!error) {
    return data as Game;
  }

  throw error;
}

export async function updateGameStage(gameId: string, stage: number) {
  const { data, error } = await supabase
    .from("games")
    .update({ stage: stage })
    .eq("id", gameId);

  if (!error) {
    return data;
  }

  throw error;
}
