import { supabase } from "./supabase.server";

export type Game = {
  id: string;
  name: string;
  stage: number;
};

export type Team = {
  id: string;
  gameId: string;
  userId: string;
  teamName: string;
  managerName: string;
  cash: number;
  isReady: boolean;
  captainBoost: number;
  trainingLevel: number;
  scoutingLevel: number;
  stadiumLevel: number;
};

const STARTING_CASH = 120;

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

export async function getTeamsInGame(gameId: string): Promise<Partial<Team>[]> {
  const { data } = await supabase
    .from("teams")
    .select(`id, team_name, manager_name`)
    .eq("gameId", gameId);
  return (
    data?.map((team) => ({
      id: team.id,
      teamName: team.team_name,
      managerName: team.manager_name,
    })) || []
  );
}

export async function getTeam(userId: string, gameId: string): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .single();

  if (!error) {
    return {
      id: data.id,
      gameId: data.game_id,
      userId: data.user_id,
      teamName: data.team_name,
      managerName: data.manager_name,
      cash: data.cash,
      isReady: data.is_ready,
      captainBoost: data.captain_boost,
      trainingLevel: data.training_level,
      scoutingLevel: data.scouting_level,
      stadiumLevel: data.stadium_level,
    };
  }

  throw error;
}

export async function addTeamToGame({
  userId,
  gameId,
  teamName,
  managerName,
}: {
  userId: string;
  gameId: string;
  teamName: string;
  managerName: string;
}): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .insert([
      {
        game_id: gameId,
        user_id: userId,
        team_name: teamName,
        manager_name: managerName,
        cash: STARTING_CASH,
      },
    ])
    .single();

  if (!error) {
    return data;
  }

  throw error;
}
