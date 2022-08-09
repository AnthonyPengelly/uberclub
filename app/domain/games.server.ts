import type { Season } from "./season.server";
import { supabase } from "./supabase.server";

export type Game = {
  id: string;
  name: string;
  stage: number;
  playerCollectionId: string;
};

export type DetailedGame = {
  seasons: Season[];
  players: number;
} & Game;

export async function getGamesList(): Promise<DetailedGame[]> {
  const { data } = await supabase
    .from("games")
    .select(
      "id, name, stage, player_collection_id, seasons (name, id, season), teams (id)"
    );
  return (
    data?.map((x) => ({
      id: x.id,
      name: x.name,
      stage: x.stage,
      playerCollectionId: x.player_collection_id,
      seasons: x.seasons.map(
        (y: { id: string; name: string; season: number }) => ({
          id: y.id,
          name: y.name,
          seasonNumber: y.season,
        })
      ),
      players: x.teams.length,
    })) || []
  );
}

export async function getGame(id: string): Promise<Game> {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (!error) {
    return {
      id: data.id,
      name: data.name,
      stage: data.stage,
      playerCollectionId: data.player_collection_id,
    } as Game;
  }

  throw error;
}

export async function createGame(
  name: string,
  playerCollectionId: string
): Promise<Game> {
  const { data, error } = await supabase
    .from("games")
    .insert([{ name, player_collection_id: playerCollectionId }])
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
