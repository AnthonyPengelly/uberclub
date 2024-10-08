import { Status } from "~/engine/transfers";
import { supabase } from "./supabase.server";

export type TransferBid = {
  id: string;
  buyingTeamId: string;
  sellingTeamId: string;
  cost: number;
  status: Status;
  players: {
    buyingTeam: boolean;
    loan: boolean;
    playerId: string;
    name: string;
  }[];
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
      `id, buying_team_id, selling_team_id, cost, status, created_at,
      player_transfers (player_game_state_id, buying_team, loan, player_game_states (real_players (name)))`
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
      cost: x.cost,
      status: x.status,
      players: x.player_transfers.map((y: any) => ({
        playerId: y.player_game_state_id,
        buyingTeam: y.buying_team,
        loan: y.loan,
        name: y.player_game_states.real_players.name,
      })),
    })) || []
  );
}

export async function getTransferBid(id: string): Promise<TransferBid> {
  const { data, error } = await supabase
    .from("transfer_bids")
    .select(
      `id, buying_team_id, selling_team_id, cost, status,
      player_transfers (player_game_state_id, buying_team, loan, player_game_states (real_players (name)))`
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
    cost: data.cost,
    status: data.status,
    players: data.player_transfers.map((x: any) => ({
      playerId: x.player_game_state_id,
      buyingTeam: x.buying_team,
      loan: x.loan,
      name: x.player_game_states.real_players.name,
    })),
  };
}

export async function createTransferBid(
  buyingTeamId: string,
  sellingTeamId: string,
  cost: number
): Promise<string> {
  const { data, error } = await supabase
    .from("transfer_bids")
    .insert([
      {
        buying_team_id: buyingTeamId,
        selling_team_id: sellingTeamId,
        cost,
        status: Status.Pending,
      },
    ])
    .select();

  if (error) {
    throw error;
  }
  return data.id;
}

export async function createPlayerTransfer(
  bidId: string,
  playerId: string,
  buyingTeam: boolean,
  loan: boolean
): Promise<string> {
  const { data, error } = await supabase
    .from("player_transfers")
    .insert([
      {
        transfer_bid_id: bidId,
        player_game_state_id: playerId,
        buying_team: buyingTeam,
        loan,
      },
    ])
    .select();

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
