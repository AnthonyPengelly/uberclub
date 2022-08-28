import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { useState } from "react";
import invariant from "tiny-invariant";
import LoadingForm from "~/components/loadingForm";
import PlayerDisplay from "~/components/playerDisplay";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import type { GamePlayer } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import type { Team } from "~/domain/team.server";
import { getTeamById } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import type { TransferBid } from "~/domain/transferBids.server";
import { getTransferBid } from "~/domain/transferBids.server";
import { overrideGameStageWithTeam } from "~/engine/game";
import { MAX_SQUAD_SIZE } from "~/engine/team";
import { createBid } from "~/engine/transfers";
import { requireUserId } from "~/session.server";

type LoaderData = {
  team: Team;
  otherTeam: Team;
  game: Game;
  ownPlayers: GamePlayer[];
  otherTeamPlayers: GamePlayer[];
  costPlaceholder: number;
  preselectedPlayers: { playerId: string; loan: boolean }[];
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);
  const team = await getTeam(userId, params.gameId);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  overrideGameStageWithTeam(game, team);

  const url = new URL(request.url);
  const sellingTeamId = url.searchParams.get("selling-team-id");
  const bidId = url.searchParams.get("from");
  const playerId = url.searchParams.get("player-id");
  invariant(
    sellingTeamId || bidId,
    "Must provide selling-team-id or from param"
  );
  const previousBid = bidId ? await getTransferBid(bidId) : null;
  const otherTeam = await getTeamById(
    sellingTeamId || (previousBid as TransferBid).buyingTeamId
  );
  const costPlaceholder = previousBid ? previousBid.cost * -1 : 0;

  const preselectedPlayers = previousBid
    ? previousBid.players
    : [{ playerId: playerId as string, loan: false }];

  const ownPlayers = (await getTeamPlayers(team.id)).filter((x) => !x.loan);
  const otherTeamPlayers = (await getTeamPlayers(otherTeam.id))
    .map((x) => ({
      ...x,
      captain: false,
      lineupPosition: undefined,
    }))
    .filter((x) => !x.loan);

  return json<LoaderData>({
    game,
    team,
    otherTeam,
    ownPlayers,
    otherTeamPlayers,
    costPlaceholder,
    preselectedPlayers,
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);
  const team = await getTeam(userId, params.gameId);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }
  overrideGameStageWithTeam(game, team);

  const formData = await request.formData();
  const ownCash = (formData.get("own-cash") as string) || "0";
  const otherTeamCash = (formData.get("other-team-cash") as string) || "0";
  const sellingTeamId = formData.get("selling-team-id") as string;
  const buyingCost = parseInt(ownCash, 10) - parseInt(otherTeamCash, 10);

  const playerIds: string[] = [];
  const loanPlayerIds: string[] = [];

  formData.forEach((value, key) => {
    if (
      key === "own-cash" ||
      key === "other-team-cash" ||
      key === "selling-team-id" ||
      key.startsWith("_")
    ) {
      return;
    }
    if (value === "loan") {
      loanPlayerIds.push(key);
    } else {
      playerIds.push(key);
    }
  });

  await createBid(
    game,
    team,
    sellingTeamId,
    buyingCost,
    playerIds,
    loanPlayerIds
  );

  return redirect(`/games/${game.id}/transfer-hub`);
};

export default function NewTransferPage() {
  const {
    team,
    otherTeam,
    ownPlayers,
    otherTeamPlayers,
    costPlaceholder,
    preselectedPlayers,
  } = useLoaderData<LoaderData>();
  const [playersIncluded, setPlayersIncluded] =
    useState<{ playerId: string; loan: boolean }[]>(preselectedPlayers);

  // TODO canBuy
  //   const canBuy = canBuyOrSellPlayer(game);
  const ownPlayersIncluded = ownPlayers.filter((x) =>
    playersIncluded.find((y) => y.playerId === x.id && !y.loan)
  );
  const ownLoanPlayersIncluded = ownPlayers.filter((x) =>
    playersIncluded.find((y) => y.playerId === x.id && y.loan)
  );
  const theirPlayersIncluded = otherTeamPlayers.filter((x) =>
    playersIncluded.find((y) => y.playerId === x.id && !y.loan)
  );
  const theirLoanPlayersIncluded = otherTeamPlayers.filter((x) =>
    playersIncluded.find((y) => y.playerId === x.id && y.loan)
  );

  return (
    <>
      <h1>Transfer negotiations</h1>
      <h2>{team.cash}M cash available</h2>
      <div>
        {ownPlayers.length}/{MAX_SQUAD_SIZE} players in squad
      </div>
      <LoadingForm
        method="post"
        submitButtonText="Submit offer"
        buttonClass="button-centre"
        className="flow"
      >
        <div className="split | background-grey">
          <div className="flow | switch-icon">
            <h3>{team.teamName}</h3>
            <div>
              <label htmlFor="own-cash">Cash:</label>
              <br />
              <input
                className="full-width"
                type="number"
                name="own-cash"
                min="0"
                max={team.cash}
                placeholder={(costPlaceholder > 0
                  ? costPlaceholder
                  : 0
                ).toString()}
              />
            </div>
            {ownPlayersIncluded.length !== 0 && (
              <IncludedPlayers
                players={ownPlayersIncluded}
                heading="Players"
                loan={false}
                removePlayer={(id) =>
                  setPlayersIncluded(
                    playersIncluded.filter((x) => x.playerId !== id)
                  )
                }
              />
            )}
            {ownLoanPlayersIncluded.length !== 0 && (
              <IncludedPlayers
                players={ownLoanPlayersIncluded}
                heading="Loan players"
                loan={true}
                removePlayer={(id) =>
                  setPlayersIncluded(
                    playersIncluded.filter((x) => x.playerId !== id)
                  )
                }
              />
            )}
          </div>
          <div className="flow">
            <h3>{otherTeam.teamName}</h3>
            <input type="hidden" name="selling-team-id" value={otherTeam.id} />
            <div>
              <label htmlFor="other-team-cash">Cash:</label>
              <br />
              <input
                className="full-width"
                type="number"
                name="other-team-cash"
                min="0"
                placeholder={(costPlaceholder < 0
                  ? costPlaceholder * -1
                  : 0
                ).toString()}
              />
            </div>
            {theirPlayersIncluded.length !== 0 && (
              <IncludedPlayers
                players={theirPlayersIncluded}
                heading="Players"
                loan={false}
                removePlayer={(id) =>
                  setPlayersIncluded(
                    playersIncluded.filter((x) => x.playerId !== id)
                  )
                }
              />
            )}
            {theirLoanPlayersIncluded.length !== 0 && (
              <IncludedPlayers
                players={theirLoanPlayersIncluded}
                heading="Loan players"
                loan={true}
                removePlayer={(id) =>
                  setPlayersIncluded(
                    playersIncluded.filter((x) => x.playerId !== id)
                  )
                }
              />
            )}
          </div>
        </div>
      </LoadingForm>
      <details className="flow">
        <summary>
          <h3 className="inline">My players</h3>
        </summary>
        <div className="players squad-list | justify-left">
          {ownPlayers
            .filter((x) => !playersIncluded.find((y) => y.playerId === x.id))
            .map((x) => (
              <PlayerDisplay key={x.id} player={x}>
                <div className="mini-flow">
                  <button
                    className="button mini-button button-secondary"
                    onClick={() =>
                      setPlayersIncluded([
                        ...playersIncluded,
                        { playerId: x.id, loan: true },
                      ])
                    }
                  >
                    Loan
                  </button>
                  <button
                    className="button mini-button"
                    onClick={() =>
                      setPlayersIncluded([
                        ...playersIncluded,
                        { playerId: x.id, loan: false },
                      ])
                    }
                  >
                    Add
                  </button>
                </div>
              </PlayerDisplay>
            ))}
        </div>
      </details>
      <details className="flow">
        <summary>
          <h3 className="inline">Their players</h3>
        </summary>
        <div className="players squad-list | justify-left">
          {otherTeamPlayers
            .filter((x) => !playersIncluded.find((y) => y.playerId === x.id))
            .map((x) => (
              <PlayerDisplay key={x.id} player={x}>
                <div className="mini-flow">
                  <button
                    className="button mini-button button-secondary"
                    onClick={() =>
                      setPlayersIncluded([
                        ...playersIncluded,
                        { playerId: x.id, loan: true },
                      ])
                    }
                  >
                    Loan
                  </button>
                  <button
                    className="button mini-button"
                    onClick={() =>
                      setPlayersIncluded([
                        ...playersIncluded,
                        { playerId: x.id, loan: false },
                      ])
                    }
                  >
                    Add
                  </button>
                </div>
              </PlayerDisplay>
            ))}
        </div>
      </details>
    </>
  );
}

type IncludedPlayersProps = {
  players: GamePlayer[];
  heading: string;
  loan: boolean;
  removePlayer: (id: string) => void;
};

function IncludedPlayers({
  players,
  heading,
  loan,
  removePlayer,
}: IncludedPlayersProps) {
  return (
    <>
      <h4>{heading}</h4>
      <div className="players squad-list players-width-2 | justify-left">
        {players.map((x) => (
          <PlayerDisplay key={x.id} player={x}>
            <button
              className="button mini-button button-secondary"
              onClick={() => removePlayer(x.id)}
            >
              Remove
            </button>
            <input type="hidden" name={x.id} value={loan ? "loan" : "buy"} />
          </PlayerDisplay>
        ))}
      </div>
    </>
  );
}
