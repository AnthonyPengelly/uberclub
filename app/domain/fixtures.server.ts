import type { GamePlayer } from "./players.server";
import { supabase } from "./supabase.server";

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
