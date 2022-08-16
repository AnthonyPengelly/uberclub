import type { GamePlayer } from "~/domain/players.server";
import type { Filters } from "~/hooks/usePlayerFilters";

export type FiltersProps = {
  filters: Filters;
  players: (GamePlayer & { managerName: string })[];
};

export function FiltersWidget({ filters, players }: FiltersProps) {
  return (
    <details>
      <summary>
        <h3 className="inline">Filters</h3>
      </summary>
      <div className="filters">
        <select
          value={filters.position[0]}
          onChange={(e) => filters.position[1](e.target.value)}
        >
          <option value="">Choose position</option>
          <option value="GKP">GKP</option>
          <option value="DEF">DEF</option>
          <option value="MID">MID</option>
          <option value="FWD">FWD</option>
        </select>

        <select
          value={filters.owner[0]}
          onChange={(e) => filters.owner[1](e.target.value)}
        >
          <option value="">Choose owner</option>
          {[...new Set(players.map((x) => x.managerName))]
            .sort((a, b) => a.localeCompare(b))
            .map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
        </select>

        <select
          value={filters.team[0]}
          onChange={(e) => filters.team[1](e.target.value)}
        >
          <option value="">Choose team</option>
          {[...new Set(players.map((x) => x.team))]
            .sort((a, b) => a.localeCompare(b))
            .map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
        </select>

        {players.find((x) => x.country?.name) && (
          <select
            value={filters.country[0]}
            onChange={(e) => filters.country[1](e.target.value)}
          >
            <option value="">Choose country</option>
            {[...new Set(players.map((x) => x.country?.name))]
              .filter((x) => x)
              .sort((a, b) => (a as string).localeCompare(b as string))
              .map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
          </select>
        )}
      </div>
    </details>
  );
}
