import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Form, useLoaderData } from "@remix-run/react";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { ActionFunction } from "@remix-run/node";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import { Stage } from "~/engine/game";
import {
  bidForPlayer,
  bidsForTeam,
  deadlineDayPlayers,
  minBidPrice,
} from "~/engine/deadlineDay";
import type { Bid, DeadlineDayPlayer } from "~/domain/deadlineDay.server";

type LoaderData = {
  team: Team;
  game: Game;
  players: DeadlineDayPlayer[];
  bids: Bid[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const team = await getTeam(userId, params.gameId);
  const game = await getGame(params.gameId);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  const players = await deadlineDayPlayers(params.gameId);
  const bids = await bidsForTeam(team);
  return json({
    game,
    team,
    players,
    bids,
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  const playerId = formData.get("id") as string;
  invariant(params.gameId, "gameId not found");
  invariant(playerId, "playerId not found");
  const team = await getTeam(userId, params.gameId);
  const game = await getGame(params.gameId);

  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  await bidForPlayer(
    playerId,
    team,
    parseInt(formData.get("cost") as string, 10)
  );
  const players = await deadlineDayPlayers(params.gameId);
  const bids = await bidsForTeam(team);
  return json({
    game,
    team,
    players,
    bids,
  });
};

export default function DeadlineDayPage() {
  const { game, team, players, bids } = useLoaderData<LoaderData>();

  return (
    <div>
      <h2>
        {team.teamName} - {team.cash}M
      </h2>
      {game.stage === Stage.DeadlineDay && team.isReady && (
        <div>Waiting for other players</div>
      )}
      {game.stage === Stage.DeadlineDay && !team.isReady && (
        <Form method="post" action={`/games/${game.id}/ready`}>
          <button type="submit">Complete deadline day</button>
        </Form>
      )}
      <ul>
        {players.map((x) => (
          <li key={x.id}>
            <img src={x.imageUrl} alt={x.name} width={40} height={40} />[
            {x.position}] {x.name}{" "}
            {[...Array(x.stars).keys()].map(() => "★").join("")}
            {[...Array(x.potential - x.stars).keys()]
              .map(() => "☆")
              .join("")}{" "}
            Min: {minBidPrice(x)}M
            {!bids.find((y) => y.deadlineDayPlayerId === x.deadlineDayId) &&
              game.stage === Stage.DeadlineDay &&
              !team.isReady &&
              (team.cash < minBidPrice(x) ? (
                <div>Not enough cash!</div>
              ) : (
                <Form method="post">
                  <input type="hidden" name="id" value={x.deadlineDayId} />
                  <input
                    type="number"
                    name="cost"
                    min={minBidPrice(x)}
                    max={team.cash}
                    placeholder={minBidPrice(x).toString()}
                    required
                  />
                  <button type="submit">bid</button>
                </Form>
              ))}
            {bids.find((y) => y.deadlineDayPlayerId === x.deadlineDayId) &&
              ` - ${
                bids.find((y) => y.deadlineDayPlayerId === x.deadlineDayId)
                  ?.cost
              }M submitted`}
          </li>
        ))}
      </ul>
    </div>
  );
}
