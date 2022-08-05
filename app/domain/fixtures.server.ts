import type { GamePlayer } from "./players.server";
import { supabase } from "./supabase.server";

export type Result = {
  id: string;
  seasonId: string;
  homeTeamId: string;
  awayTeamId: string;
  draw: boolean;
  winningTeamId: string | null;
};

export async function createResult(
  seasonId: string,
  homeTeamId: string,
  awayTeamId: string,
  draw: boolean,
  winningTeamId: string | null
) {
  const { data, error } = await supabase
    .from("results")
    .insert([
      {
        season_id: seasonId,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        draw,
        winning_team_id: winningTeamId,
      },
    ])
    .single();

  if (!error) {
    return data.id;
  }

  throw error;
}

export async function getResults(seasonId: string) {
  const { data, error } = await supabase
    .from("results")
    .select("*")
    .eq("season_id", seasonId);

  if (!error) {
    return data.map((x) => ({
      id: x.id,
      seasonId: x.season_id,
      homeTeamId: x.home_team_id,
      awayTeamId: x.away_team_id,
      draw: x.draw,
      winningTeamId: x.winning_team_id,
    }));
  }

  throw error;
}

export async function getResult(id: string) {
  const { data, error } = await supabase
    .from("results")
    .select("*")
    .eq("id", id)
    .single();

  if (!error) {
    return {
      id: data.id,
      seasonId: data.season_id,
      homeTeamId: data.home_team_id,
      awayTeamId: data.away_team_id,
      draw: data.draw,
      winningTeamId: data.winning_team_id,
    };
  }

  throw error;
}

export async function createFixtureLineups(
  resultId: string,
  players: GamePlayer[]
) {
  const { data, error } = await supabase.from("fixture_lineups").insert(
    players.map((x) => ({
      result_id: resultId,
      player_game_state_id: x.id,
      lineup_position: x.lineupPosition,
      captain: x.captain,
    }))
  );

  if (!error) {
    return data;
  }

  throw error;
}

export async function getFixtureLineups(
  resultId: string
): Promise<GamePlayer[]> {
  const { data, error } = await supabase
    .from("fixture_lineups")
    .select(
      `lineup_position, captain, player_game_states (id, stars, team_id, injured,
        real_players (name, overall, potential, image_url, positions (name), real_teams (name)))`
    )
    .eq("result_id", resultId);

  if (!error) {
    return data.map((x) => ({
      id: x.player_game_states.id,
      teamId: x.player_game_states.team_id,
      lineupPosition: x.lineup_position,
      captain: x.captain,
      injured: x.player_game_states.injured,
      stars: x.player_game_states.stars,
      name: x.player_game_states.real_players.name,
      position: x.player_game_states.real_players.positions.name,
      overall: x.player_game_states.real_players.overall,
      potential: x.player_game_states.real_players.potential,
      team: x.player_game_states.real_players.real_teams.team,
      imageUrl: x.player_game_states.real_players.image_url,
    }));
  }

  throw error;
}
