import { useState } from "react";
import type { GamePlayer } from "~/domain/players.server";

export type Filter = [string | undefined, (value: string | undefined) => void];

export type Filters = {
  position: Filter;
  owner: Filter;
  team: Filter;
  country: Filter;
};

export function usePlayerFilters(
  players: (GamePlayer & { managerName: string })[]
): {
  filteredPlayers: (GamePlayer & { managerName: string })[];
  filters: Filters;
} {
  const position = useState<string>();
  const owner = useState<string>();
  const team = useState<string>();
  const country = useState<string>();

  const filteredPlayers = players.filter((x) => {
    if (position[0] && x.position !== position[0]) {
      return false;
    }
    if (owner[0] && x.managerName !== owner[0]) {
      return false;
    }
    if (team[0] && x.team !== team[0]) {
      return false;
    }
    if (country[0] && x.country && x.country.name !== country[0]) {
      return false;
    }
    return true;
  });
  return {
    filteredPlayers,
    filters: {
      position,
      owner,
      team,
      country,
    },
  };
}
