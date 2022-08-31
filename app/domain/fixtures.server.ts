import type { Stage } from "~/engine/game";
import type { GamePlayer } from "./players.server";
import { supabase } from "./supabase.server";

export type Result = {
  id: string;
  stage: Stage;
  seasonId: string;
  homeTeamId: string;
  awayTeamId?: string;
  draw?: boolean;
  winningTeamId?: string;
  simWin?: boolean;
  realTeamId?: string;
  homeDef?: number;
  homeMid?: number;
  homeFwd?: number;
  awayDef?: number;
  awayMid?: number;
  awayFwd?: number;
};

export type ResultSummary = {
  realTeamName?: string;
} & Result;

export async function createResult(result: Omit<Result, "id">) {
  const { data, error } = await supabase
    .from("results")
    .insert([
      {
        season_id: result.seasonId,
        home_team_id: result.homeTeamId,
        away_team_id: result.awayTeamId,
        real_team_id: result.realTeamId,
        stage: result.stage,
      },
    ])
    .single();

  if (!error) {
    return data.id;
  }

  throw error;
}

export async function getResults(seasonId: string): Promise<ResultSummary[]> {
  const { data, error } = await supabase
    .from("results")
    .select(
      `id, season_id, home_team_id, away_team_id, draw, sim_win, real_team_id,
      winning_team_id, stage, real_teams (name)`
    )
    .eq("season_id", seasonId)
    .order("id")
    .order("stage");

  if (!error) {
    return data.map((x) => ({
      id: x.id,
      seasonId: x.season_id,
      homeTeamId: x.home_team_id,
      awayTeamId: x.away_team_id,
      draw: x.draw,
      simWin: x.sim_win,
      realTeamId: x.real_team_id,
      winningTeamId: x.winning_team_id,
      stage: x.stage,
      realTeamName: x.real_teams?.name,
    }));
  }

  throw error;
}

export async function getResultsForStage(
  seasonId: string,
  stage: Stage
): Promise<ResultSummary[]> {
  const { data, error } = await supabase
    .from("results")
    .select(
      `id, season_id, home_team_id, away_team_id, draw, sim_win, real_team_id,
      winning_team_id, stage, real_teams (name)`
    )
    .eq("season_id", seasonId)
    .eq("stage", stage)
    .order("id");

  if (!error) {
    return data.map((x) => ({
      id: x.id,
      seasonId: x.season_id,
      homeTeamId: x.home_team_id,
      awayTeamId: x.away_team_id,
      draw: x.draw,
      simWin: x.sim_win,
      realTeamId: x.real_team_id,
      winningTeamId: x.winning_team_id,
      stage: x.stage,
      realTeamName: x.real_teams?.name,
    }));
  }

  throw error;
}

export async function getResult(id: string): Promise<Result> {
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
      simWin: data.sim_win,
      realTeamId: data.real_team_id,
      winningTeamId: data.winning_team_id,
      stage: data.stage,
      homeDef: data.home_def,
      homeMid: data.home_mid,
      homeFwd: data.home_fwd,
      awayDef: data.away_def,
      awayMid: data.away_mid,
      awayFwd: data.away_fwd,
    };
  }

  throw error;
}

export async function updateResult(
  resultId: string,
  draw: boolean,
  winningTeamId: string | null,
  homeDef: number,
  homeMid: number,
  homeFwd: number,
  awayDef: number,
  awayMid: number,
  awayFwd: number
) {
  const { error } = await supabase
    .from("results")
    .update({
      draw,
      winning_team_id: winningTeamId,
      home_def: homeDef,
      home_mid: homeMid,
      home_fwd: homeFwd,
      away_def: awayDef,
      away_mid: awayMid,
      away_fwd: awayFwd,
    })
    .eq("id", resultId);

  if (error) {
    throw error;
  }
}

export async function updateSimResult(
  resultId: string,
  simWin: boolean,
  draw: boolean,
  winningTeamId: string | null,
  homeDef: number,
  homeMid: number,
  homeFwd: number,
  awayDef: number,
  awayMid: number,
  awayFwd: number
) {
  const { error } = await supabase
    .from("results")
    .update({
      draw,
      sim_win: simWin,
      winning_team_id: winningTeamId,
      home_def: homeDef,
      home_mid: homeMid,
      home_fwd: homeFwd,
      away_def: awayDef,
      away_mid: awayMid,
      away_fwd: awayFwd,
    })
    .eq("id", resultId);

  if (error) {
    throw error;
  }
}

export async function createFixtureLineups(
  resultId: string,
  players: GamePlayer[],
  captainBoost: number,
  home: boolean,
  realTeamId?: string
) {
  const { data, error } = await supabase.from("fixture_lineups").insert(
    players.map((x) => ({
      result_id: resultId,
      player_game_state_id: x.id,
      lineup_position: x.lineupPosition,
      captain_boost: x.captain ? captainBoost : null,
      real_team_id: realTeamId,
      injured: !!x.injured,
      stars: x.stars,
      home,
    }))
  );

  if (!error) {
    return data;
  }

  throw error;
}

export async function getFixtureLineups(
  resultId: string,
  home: boolean
): Promise<GamePlayer[]> {
  const { data, error } = await supabase
    .from("fixture_lineups")
    .select(
      `lineup_position, captain_boost, real_team_id, injured, stars, home, player_game_states (id, stars, team_id, injured, loanee_id, hidden_gem_games,
        real_players (name, overall, potential, image_url, positions (name), real_teams (name, image_url), real_countries (name, image_url)))`
    )
    .eq("result_id", resultId)
    .eq("home", home);

  if (!error) {
    return data.map((x) => ({
      id: x.player_game_states.id,
      teamId: x.player_game_states.team_id,
      lineupPosition: x.lineup_position,
      captain: !!x.captain_boost,
      captainBoost: x.captain_boost,
      injured: x.injured,
      stars: x.stars,
      loan: !!x.player_game_states.loanee_id,
      hiddenGemGames: x.player_game_states.hidden_gem_games,
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
      realTeamId: x.real_team_id,
    }));
  }

  throw error;
}

export async function countFixturesPlayed(playerId: string, seasonId: string) {
  const { error, count } = await supabase
    .from("fixture_lineups")
    .select(
      `id, player_game_state_id, real_team_id, results!inner (id, season_id)`,
      { count: "exact" }
    )
    .eq("player_game_state_id", playerId)
    .eq("results.season_id", seasonId)
    .is("real_team_id", null);

  if (error) {
    throw error;
  }

  return count || 0;
}
