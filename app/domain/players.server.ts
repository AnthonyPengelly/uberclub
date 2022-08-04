import { supabase } from "./supabase.server";

export type RealTeam = {
  id: string;
  name: string;
};

export type Position = {
  id: string;
  name: string;
};

export type RealPlayer = {
  id: string;
  name: string;
  overall: number;
  potential: number;
  realTeamId: string;
  positionId: string;
  imageUrl: string;
};

export type PlayerGameState = {
  id: string;
  playerId: string;
  gameId: string;
  teamId?: string;
  lineupPosition?: number;
  captain: boolean;
  injured: boolean;
  stars: number;
  released: boolean;
};

export type GamePlayerSummary = {
  id: string;
  overall: number;
  position: string;
};

export type GamePlayer = {
  id: string;
  name: string;
  overall: number;
  potential: number;
  team: string;
  position: string;
  imageUrl: string;
  lineupPosition?: number;
  captain: boolean;
  injured: boolean;
  stars: number;
};

export async function getPlayersList(): Promise<RealPlayer[]> {
  const { data } = await supabase
    .from("real_players")
    .select("id, name, overall, potential");
  return data || [];
}

export async function getPlayersForDraft(
  gameId: string
): Promise<GamePlayerSummary[]> {
  const { data, error } = await supabase
    .from("player_game_states")
    .select("id, real_players (overall, positions (name))")
    .eq("game_id", gameId);
  if (error) {
    throw error;
  }
  return (
    data?.map((x) => ({
      id: x.id,
      overall: x.real_players.overall,
      position: x.real_players.positions.name,
    })) || []
  );
}

export async function getTeamPlayers(
  teamId: string
): Promise<GamePlayerSummary[]> {
  const { data, error } = await supabase
    .from("player_game_states")
    .select(
      `id, lineup_position, captain, injured, stars,
        real_players (name, overall, potential, image_url, positions (name), real_teams (name))`
    )
    .eq("team_id", teamId);
  if (error) {
    throw error;
  }
  return (
    data?.map((x) => ({
      id: x.id,
      lineupPosition: x.lineup_position,
      captain: x.captain,
      injured: x.injured,
      stars: x.stars,
      name: x.real_players.name,
      position: x.real_players.positions.name,
      overall: x.real_players.overall,
      potential: x.real_players.potential,
      team: x.real_players.real_teams.team,
      imageUrl: x.real_players.image_url,
    })) || []
  );
}

export async function addPlayerGameStates(
  players: {
    playerId: string;
    gameId: string;
    stars: number;
  }[]
): Promise<PlayerGameState[]> {
  const { data, error } = await supabase.from("player_game_states").insert(
    players.map((x) => ({
      player_id: x.playerId,
      game_id: x.gameId,
      stars: x.stars,
    }))
  );

  if (!error) {
    return data;
  }

  throw error;
}

export async function addPlayerToTeam(id: string, teamId: string) {
  const { error } = await supabase
    .from("player_game_states")
    .update({ team_id: teamId })
    .eq("id", id);

  if (error) {
    throw error;
  }
}
