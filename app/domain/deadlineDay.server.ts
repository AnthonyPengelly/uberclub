import type { GamePlayer } from "./players.server";
import { supabase } from "./supabase.server";

export type DeadlineDayPlayer = {
  deadlineDayId: string;
} & GamePlayer;

export type Bid = {
  id: string;
  teamId: string;
  deadlineDayPlayerId: string;
  cost: number;
};

export async function createDeadlineDayPlayers(
  seasonId: string,
  players: GamePlayer[]
) {
  const { data, error } = await supabase.from("deadline_day_players").insert(
    players.map((x) => ({
      season_id: seasonId,
      player_game_state_id: x.id,
    }))
  );

  if (!error) {
    return data;
  }

  throw error;
}

export async function getDeadlineDayPlayers(
  seasonId: string
): Promise<DeadlineDayPlayer[]> {
  const { data } = await supabase
    .from("deadline_day_players")
    .select(
      `id, player_game_states (
      id, lineup_position, captain, injured, stars, team_id,
        real_players (name, overall, potential, image_url, positions (name), real_teams (name, image_url), real_countries (name, image_url))
    )`
    )
    .eq("season_id", seasonId);
  return (
    data?.map((x) => ({
      deadlineDayId: x.id,
      id: x.player_game_states.id,
      teamId: x.player_game_states.team_id,
      lineupPosition: x.player_game_states.lineup_position,
      captain: x.player_game_states.captain,
      injured: x.player_game_states.injured,
      stars: x.player_game_states.stars,
      name: x.player_game_states.real_players.name,
      position: x.player_game_states.real_players.positions.name,
      overall: x.player_game_states.real_players.overall,
      potential: x.player_game_states.real_players.potential,
      team: x.player_game_states.real_players.real_teams.name,
      teamImage: x.player_game_states.real_players.real_teams.image_url,
      imageUrl: x.player_game_states.real_players.image_url,
      country: x.player_game_states.real_players.real_countries && {
        name: x.player_game_states.real_players.real_countries.name,
        imageUrl: x.player_game_states.real_players.real_countries.image_url,
      },
    })) || []
  );
}

export async function createDeadlineDayBid(
  teamId: string,
  deadlineDayPlayerId: string,
  cost: number
) {
  const { data, error } = await supabase.from("deadline_day_bids").insert([
    {
      team_id: teamId,
      deadline_day_player_id: deadlineDayPlayerId,
      cost: cost,
    },
  ]);

  if (!error) {
    return data;
  }

  throw error;
}

export async function getBidsForTeam(
  teamId: string,
  seasonId: string
): Promise<Bid[]> {
  const { data } = await supabase
    .from("deadline_day_bids")
    .select(
      "id, deadline_day_player_id, cost, team_id, deadline_day_players!inner(season_id)"
    )
    .eq("team_id", teamId)
    .eq("deadline_day_players.season_id", seasonId);

  return (
    data?.map((x) => ({
      id: x.id,
      teamId: x.team_id,
      deadlineDayPlayerId: x.deadline_day_player_id,
      cost: x.cost,
    })) || []
  );
}

export async function getBidsForPlayer(
  deadlineDayPlayerId: string
): Promise<Bid[]> {
  const { data } = await supabase
    .from("deadline_day_bids")
    .select("id, team_id, deadline_day_player_id, cost")
    .eq("deadline_day_player_id", deadlineDayPlayerId);

  return (
    data?.map((x) => ({
      id: x.id,
      teamId: x.team_id,
      deadlineDayPlayerId: x.deadline_day_player_id,
      cost: x.cost,
    })) || []
  );
}
