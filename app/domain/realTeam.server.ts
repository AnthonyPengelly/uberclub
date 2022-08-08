import { supabase } from "./supabase.server";

export type RealTeam = {
  id: string;
  name: string;
};

export async function getRandomRealTeam(): Promise<RealTeam> {
  const { data, error } = await supabase.from("real_teams").select(`*`);
  if (error) {
    throw error;
  }
  return data && data[Math.floor(Math.random() * data.length)];
}

export async function getRealTeam(id: string): Promise<RealTeam> {
  const { data, error } = await supabase
    .from("real_teams")
    .select(`*`)
    .eq("id", id)
    .single();
  if (error) {
    throw error;
  }
  return data;
}
