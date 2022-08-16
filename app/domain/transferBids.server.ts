import { Status } from "~/engine/transfers";
import type { GamePlayer } from "./players.server";
import { supabase } from "./supabase.server";

export type TransferBid = {
  id: string;
  buyingTeamId: string;
  sellingTeamId: string;
  playerGameStateId: string;
  cost: number;
  status: Status;
};

export async function teamHasPendingBids(teamId: string): Promise<boolean> {
  const { count } = await supabase
    .from("transfer_bids")
    .select(`id`, { count: "exact" })
    .eq("selling_team_id", teamId)
    .eq("status", Status.Pending);
  return count ? count > 0 : false;
}

export async function getTransferBidsForTeam(
  teamId: string
): Promise<TransferBid[]> {
  const { data, error } = await supabase
    .from("transfer_bids")
    .select(
      "id, buying_team_id, selling_team_id, cost, player_game_state_id, status, created_at"
    )
    .or(`buying_team_id.eq.${teamId},selling_team_id.eq.${teamId}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }
  return (
    data?.map((x) => ({
      id: x.id,
      buyingTeamId: x.buying_team_id,
      sellingTeamId: x.selling_team_id,
      playerGameStateId: x.player_game_state_id,
      cost: x.cost,
      status: x.status,
    })) || []
  );
}

export async function getTransferBid(id: string): Promise<TransferBid> {
  const { data, error } = await supabase
    .from("transfer_bids")
    .select(
      "id, buying_team_id, selling_team_id, cost, player_game_state_id, status"
    )
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }
  return {
    id: data.id,
    buyingTeamId: data.buying_team_id,
    sellingTeamId: data.selling_team_id,
    playerGameStateId: data.player_game_state_id,
    cost: data.cost,
    status: data.status,
  };
}

export async function createTransferBidForPlayer(
  buyingTeamId: string,
  player: GamePlayer,
  cost: number
): Promise<string> {
  const { data, error } = await supabase
    .from("transfer_bids")
    .insert([
      {
        buying_team_id: buyingTeamId,
        selling_team_id: player.teamId,
        player_game_state_id: player.id,
        cost,
        status: Status.Pending,
      },
    ])
    .single();

  if (error) {
    throw error;
  }
  return data.id;
}

export async function updateTransferBidStatus(
  id: string,
  status: Status
): Promise<void> {
  const { error } = await supabase
    .from("transfer_bids")
    .update({
      status,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }
}
