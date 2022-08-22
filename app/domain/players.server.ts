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
  outOfDeck: boolean;
};

export type GamePlayerSummary = {
  id: string;
  overall: number;
  position: string;
};

export type GamePlayer = {
  id: string;
  teamId?: string;
  name: string;
  overall: number;
  potential: number;
  team: string;
  position: string;
  imageUrl: string;
  lineupPosition?: number | null;
  captain: boolean;
  injured: boolean;
  stars: number;
  /**
   * this indicates that they are playing for an ai team
   */
  realTeamId?: string;
  captainBoost?: number;
  country?: {
    name: string;
    imageUrl: string;
  };
};

export async function getPlayersList(
  playerCollectionId: string
): Promise<RealPlayer[]> {
  const { data } = await supabase
    .from("real_players")
    .select(
      "id, name, overall, potential, real_team_id, real_teams!inner ( player_collection_ id )"
    )
    .eq("real_teams.player_collection_id", playerCollectionId);
  return (
    data?.map((x) => ({
      ...x,
      realTeamId: x.real_team_id,
    })) || []
  );
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

export async function getTeamPlayers(teamId: string): Promise<GamePlayer[]> {
  const { data, error } = await supabase
    .from("player_game_states")
    .select(
      `id, lineup_position, captain, injured, stars, team_id,
        real_players (name, overall, potential, image_url, positions (name), real_teams (name), real_countries (name, image_url))`
    )
    .eq("team_id", teamId);
  if (error) {
    throw error;
  }
  return (
    data
      ?.map((x) => ({
        id: x.id,
        teamId: x.team_id,
        lineupPosition: x.lineup_position,
        captain: x.captain,
        injured: x.injured,
        stars: x.stars,
        name: x.real_players.name,
        position: x.real_players.positions.name,
        overall: x.real_players.overall,
        potential: x.real_players.potential,
        team: x.real_players.real_teams.name,
        imageUrl: x.real_players.image_url,
        country: x.real_players.real_countries && {
          name: x.real_players.real_countries.name,
          imageUrl: x.real_players.real_countries.image_url,
        },
      }))
      .sort((a, b) => b.id.localeCompare(b.id))
      .sort((a, b) => b.potential - a.potential)
      .sort((a, b) => b.stars - a.stars)
      .sort(sortPlayers) || []
  );
}

export async function getRealTeamPlayers(
  realTeamId: string,
  gameId: string
): Promise<GamePlayer[]> {
  const { data, error } = await supabase
    .from("player_game_states")
    .select(
      `id, game_id, lineup_position, captain, injured, stars, team_id,
        real_players!inner (name, overall, potential, image_url, positions (name), real_team_id, real_teams (id, name), real_countries (name, image_url))`
    )
    .eq("game_id", gameId)
    .eq("real_players.real_team_id", realTeamId);

  if (error) {
    throw error;
  }
  return (
    data
      ?.map((x) => ({
        id: x.id,
        teamId: x.team_id,
        lineupPosition: x.lineup_position,
        captain: x.captain,
        injured: x.injured,
        stars: x.stars,
        name: x.real_players.name,
        position: x.real_players.positions.name,
        overall: x.real_players.overall,
        potential: x.real_players.potential,
        team: x.real_players.real_teams.name,
        imageUrl: x.real_players.image_url,
        country: x.real_players.real_countries && {
          name: x.real_players.real_countries.name,
          imageUrl: x.real_players.real_countries.image_url,
        },
      }))
      .sort((a, b) => b.id.localeCompare(b.id))
      .sort((a, b) => b.potential - a.potential)
      .sort((a, b) => b.stars - a.stars)
      .sort(sortPlayers) || []
  );
}

export async function getPlayer(id: string): Promise<GamePlayer> {
  const { data, error } = await supabase
    .from("player_game_states")
    .select(
      `id, lineup_position, captain, injured, stars, team_id,
        real_players (name, overall, potential, image_url, positions (name), real_teams (name), real_countries (name, image_url))`
    )
    .eq("id", id)
    .single();
  if (error) {
    throw error;
  }
  return {
    id: data.id,
    teamId: data.team_id,
    lineupPosition: data.lineup_position,
    captain: data.captain,
    injured: data.injured,
    stars: data.stars,
    name: data.real_players.name,
    position: data.real_players.positions.name,
    overall: data.real_players.overall,
    potential: data.real_players.potential,
    team: data.real_players.real_teams.name,
    imageUrl: data.real_players.image_url,
    country: data.real_players.real_countries && {
      name: data.real_players.real_countries.name,
      imageUrl: data.real_players.real_countries.image_url,
    },
  };
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
    .update({ team_id: teamId, out_of_deck: true })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function markPlayerOutOfDeck(id: string) {
  const { error } = await supabase
    .from("player_game_states")
    .update({ out_of_deck: true })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function updatePlayerStars(id: string, stars: number) {
  const { error } = await supabase
    .from("player_game_states")
    .update({ stars: stars })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function removePlayerFromTeam(id: string) {
  const { error } = await supabase
    .from("player_game_states")
    .update({ team_id: null })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function updatePlayerLineupPosition(
  id: string,
  lineupPosition: number | undefined | null,
  captain: boolean
) {
  const { error } = await supabase
    .from("player_game_states")
    .update({ lineup_position: lineupPosition || null, captain })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function setInjured(id: string, injured: boolean) {
  const { error } = await supabase
    .from("player_game_states")
    .update({ injured })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function resetInjuredForGame(gameId: string) {
  const { error } = await supabase
    .from("player_game_states")
    .update({ injured: false })
    .eq("game_id", gameId);

  if (error) {
    throw error;
  }
}

export async function drawPlayersFromDeck(
  gameId: string,
  numberOfPlayers: number
): Promise<GamePlayer[]> {
  const { data, error } = await supabase
    .from("player_game_states")
    .select(
      `id, lineup_position, captain, injured, stars,
          real_players (name, overall, potential, image_url, positions (name), real_teams (name), real_countries (name, image_url))`
    )
    .eq("game_id", gameId)
    .is("team_id", null)
    .is("out_of_deck", false);
  if (error) {
    throw error;
  }
  const randomPlayers = data.sort(() => 0.5 - Math.random());
  return randomPlayers.slice(0, numberOfPlayers).map((x) => ({
    id: x.id,
    teamId: undefined,
    lineupPosition: x.lineup_position,
    captain: x.captain,
    injured: x.injured,
    stars: x.stars,
    name: x.real_players.name,
    position: x.real_players.positions.name,
    overall: x.real_players.overall,
    potential: x.real_players.potential,
    team: x.real_players.real_teams.name,
    imageUrl: x.real_players.image_url,
    country: x.real_players.real_countries && {
      name: x.real_players.real_countries.name,
      imageUrl: x.real_players.real_countries.image_url,
    },
  }));
}

function sortPlayers(a: GamePlayer, b: GamePlayer) {
  if (a.position === b.position) {
    return 0;
  }
  if (a.position === "GKP") {
    return -1;
  }
  if (b.position === "GKP") {
    return 1;
  }
  if (a.position === "DEF") {
    return -1;
  }
  if (b.position === "DEF") {
    return 1;
  }
  if (a.position === "MID") {
    return -1;
  }
  if (b.position === "MID") {
    return 1;
  }
  return 0;
}
