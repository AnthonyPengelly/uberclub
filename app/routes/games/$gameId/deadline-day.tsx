import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, useLoaderData } from "@remix-run/react";
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
import LoadingForm from "~/components/loadingForm";
import PlayerDisplay from "~/components/playerDisplay";
import { getTeamPlayers } from "~/domain/players.server";
import { MAX_SQUAD_SIZE } from "~/engine/team";

type LoaderData = {
  team: Team;
  game: Game;
  players: DeadlineDayPlayer[];
  bids: Bid[];
  squadSize: number;
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
  const squad = await getTeamPlayers(team.id);
  const bids = await bidsForTeam(team);
  return json({
    game,
    team,
    players,
    bids,
    squadSize: squad.length,
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
  const squad = await getTeamPlayers(team.id);
  const bids = await bidsForTeam(team);

  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  await bidForPlayer(
    playerId,
    team,
    bids,
    parseInt(formData.get("cost") as string, 10)
  );
  const players = await deadlineDayPlayers(params.gameId);
  return json({
    game,
    team,
    players,
    bids,
    squadSize: squad.length,
  });
};

export default function DeadlineDayPage() {
  const { game, team, players, bids, squadSize } = useLoaderData<LoaderData>();

  return (
    <>
      <h1>
        {team.teamName} - {team.cash}M
      </h1>
      <Link to={`/games/${game.id}/sell`}>«Sell players»</Link>
      <div className="flow | quote">
        <p>
          It's deadline day! Here you can see the players available to buy. This
          is a closed bid though, you can only submit one bid per-player, and
          you're committed to that spend if you are highest so bid wisely...
        </p>
        {game.stage === Stage.DeadlineDay && team.isReady && (
          <p>
            Phew. You're bids are all in, now all we can do is cross our fingers
            🤞
          </p>
        )}
        {game.stage !== Stage.DeadlineDay && (
          <p>
            It's not yet deadline day. Come back at the end of the next pre
            season to find out who you can pick up.
          </p>
        )}
      </div>
      {game.stage === Stage.DeadlineDay && !team.isReady && (
        <LoadingForm
          method="post"
          action={`/games/${game.id}/ready`}
          submitButtonText="Complete deadline day"
        />
      )}
      <div className="players squad-list | justify-left">
        {players.map((x) => (
          <>
            <PlayerDisplay key={x.id} player={x} />
            <div className="deadline-day-info">
              Min bid: {minBidPrice(x)}M
              {!bids.find((y) => y.deadlineDayPlayerId === x.deadlineDayId) &&
                game.stage === Stage.DeadlineDay &&
                !team.isReady &&
                (team.cash < minBidPrice(x) ? (
                  <div>Not enough cash!</div>
                ) : squadSize + bids.length >= MAX_SQUAD_SIZE ? (
                  <div>Your squad is full!</div>
                ) : (
                  <LoadingForm
                    method="post"
                    submitButtonText="Bid"
                    buttonClass="mini-button"
                  >
                    <input type="hidden" name="id" value={x.deadlineDayId} />
                    <input
                      className="mini-input"
                      type="number"
                      name="cost"
                      min={minBidPrice(x)}
                      max={team.cash}
                      placeholder={minBidPrice(x).toString()}
                      required
                    />
                  </LoadingForm>
                ))}
              {bids.find((y) => y.deadlineDayPlayerId === x.deadlineDayId) && (
                <div>
                  ✅{" "}
                  {
                    bids.find((y) => y.deadlineDayPlayerId === x.deadlineDayId)
                      ?.cost
                  }
                  M
                </div>
              )}
            </div>
          </>
        ))}
      </div>
    </>
  );
}
