import { useFetcher, useNavigate } from "@remix-run/react";
import { useCallback, useEffect } from "react";
import type { Game } from "~/domain/games.server";

function useRevalidate() {
  // We get the navigate function from React Rotuer
  const navigate = useNavigate();
  // And return a function which will navigate to `.` (same URL) and replace it
  return useCallback(
    function revalidate() {
      navigate(".", { replace: true });
    },
    [navigate]
  );
}
type IntervalOptions = {
  enabled?: boolean;
  intervalSeconds?: number;
  game: Game;
};

export function useRevalidateOnInterval({
  game,
  enabled = false,
  intervalSeconds = 10,
}: IntervalOptions) {
  const revalidate = useRevalidate();
  const fetcher = useFetcher();
  useEffect(
    function revalidateOnInterval() {
      if (!enabled) return;
      const intervalId = setInterval(() => {
        fetcher.load(`/games/${game.id}/stage`);
      }, intervalSeconds * 1000);
      if (fetcher.data && fetcher.data?.stage !== game.stage) {
        revalidate();
      }
      return () => clearInterval(intervalId);
    },
    [enabled, revalidate, intervalSeconds, fetcher, game.stage, game.id]
  );
}
