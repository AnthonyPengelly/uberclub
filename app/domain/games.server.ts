import type { Season } from "./season.server";
import { supabase } from "./supabase.server";

export type Game = {
  id: string;
  name: string;
  stage: number;
  playerCollectionId: string;
  winningTeam?: string;
  victoryPoints: number;
};

export type DetailedGame = {
  seasons: Season[];
  players: number;
} & Game;

export async function getGamesList(): Promise<DetailedGame[]> {
  const { data, error } = await supabase
    .from("games")
    .select(
      "id, name, stage, winning_team, player_collection_id, victory_points, seasons (name, id, season), teams (id)"
    );
  if (error) {
    throw error;
  }
  return (
    data?.map((x) => ({
      id: x.id,
      name: x.name,
      victoryPoints: x.victory_points,
      stage: x.stage,
      playerCollectionId: x.player_collection_id,
      winningTeam: x.winning_team,
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
      winningTeam: data.winning_team,
      victoryPoints: data.victory_points,
    } as Game;
  }

  throw error;
}

export async function createGame(
  name: string,
  playerCollectionId: string,
  victoryPoints: number | undefined
): Promise<Game> {
  const { data, error } = await supabase
    .from("games")
    .insert([
      {
        name,
        player_collection_id: playerCollectionId,
        victory_points: victoryPoints || 100,
      },
    ])
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

export async function recordWinner(gameId: string, winningTeam: string) {
  const { data, error } = await supabase
    .from("games")
    .update({ winning_team: winningTeam })
    .eq("id", gameId);

  if (!error) {
    return data;
  }

  throw error;
}
