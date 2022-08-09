import { supabase } from "./supabase.server";

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

export async function getTeamsInGame(gameId: string): Promise<Team[]> {
  const { data } = await supabase
    .from("teams")
    .select(`*`)
    .eq("game_id", gameId);
  return (
    data?.map((team) => ({
      id: team.id,
      gameId: team.game_id,
      userId: team.user_id,
      teamName: team.team_name,
      managerName: team.manager_name,
      cash: team.cash,
      isReady: team.is_ready,
      captainBoost: team.captain_boost,
      trainingLevel: team.training_level,
      scoutingLevel: team.scouting_level,
      stadiumLevel: team.stadium_level,
    })) || []
  );
}

export async function countTeamsInGame(gameId: string): Promise<number> {
  const { count } = await supabase
    .from("teams")
    .select(`id`, { count: "exact" })
    .eq("game_id", gameId);
  return count as number;
}

export async function getTeam(userId: string, gameId: string): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("user_id", userId)
    .eq("game_id", gameId)
    .maybeSingle();

  if (!error) {
    return (
      data && {
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
      }
    );
  }

  throw error;
}

export async function getTeamById(id: string): Promise<Team> {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .single();

  if (!error) {
    return (
      data && {
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
      }
    );
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
}) {
  const { error } = await supabase
    .from("teams")
    .insert([
      {
        game_id: gameId,
        user_id: userId,
        team_name: teamName,
        manager_name: managerName,
        cash: STARTING_CASH,
        captain_boost: 1,
      },
    ])
    .single();

  if (error) {
    throw error;
  }
}

export async function updateCash(id: string, cashRemaining: number) {
  const { error } = await supabase
    .from("teams")
    .update({ cash: cashRemaining })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function updateCaptainBoost(id: string, captainBoost: number) {
  const { error } = await supabase
    .from("teams")
    .update({ captain_boost: captainBoost })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function markAsReady(id: string, ready: boolean = true) {
  const { error } = await supabase
    .from("teams")
    .update({ is_ready: ready })
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function updateImprovements(
  id: string,
  trainingLevel: number,
  scoutingLevel: number,
  stadiumLevel: number
) {
  const { error } = await supabase
    .from("teams")
    .update({
      training_level: trainingLevel,
      scouting_level: scoutingLevel,
      stadium_level: stadiumLevel,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}
