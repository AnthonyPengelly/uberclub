import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useSubmit, useTransition } from "@remix-run/react";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { GamePlayer } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import {
  addPlayerToLineup,
  findPlayerInPosition,
  getLineupScores,
  hasChemistry,
  MAX_DEF_POSITION,
  MAX_MID_POSITION,
  removePlayerFromLineup,
  validateLineup,
} from "~/engine/lineup";
import { canSellPlayer, Stage } from "~/engine/game";
import PlayerDisplay from "~/components/playerDisplay";
import LoadingForm from "~/components/loadingForm";
import { updatePlayersBasedOnFormData } from "~/engine/team";
import PlayerSelection from "~/components/playerSelection";
import { getScoutPrice } from "~/engine/scouting";

type LoaderData = {
  team: Team;
  players: GamePlayer[];
  game: Game;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const team = await getTeam(userId, params.gameId);
  const players = await getTeamPlayers(team.id);
  const game = await getGame(params.gameId);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ team, players, game });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);
  const formData = await request.formData();
  const team = await getTeam(userId, params.gameId);
  const playerId = formData.get("player-id") as string;
  const existingPlayerId = formData.get("existing-player-id") as string;
  const position = parseInt(formData.get("position") as string, 10);
  invariant(position, "position not found");

  if (playerId === "null" || !playerId) {
    await removePlayerFromLineup(existingPlayerId);
  } else {
    await addPlayerToLineup(playerId, position, existingPlayerId);
  }

  const players = await getTeamPlayers(team.id);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ team, players, game });
};

export default function TeamPage() {
  const { submission } = useTransition();
  const submit = useSubmit();
  const { team, players, game } = useLoaderData<LoaderData>();
  if (submission && submission.formData.get("position")) {
    updatePlayersBasedOnFormData(players, submission.formData);
  }
  const scores = getLineupScores(players, team.captainBoost);
  const validationMessage = validateLineup(players);
  const isMatchDay =
    game.stage === Stage.Match1 ||
    game.stage === Stage.Match2 ||
    game.stage === Stage.Match3;
  const canMakeChanges = !team.isReady || !isMatchDay;
  const canSell = canSellPlayer(game) && players.length > 11;
  const captain = players.find((x) => x.captain);

  return (
    <>
      <h1 className="centre">{team.teamName} Lineup</h1>
      <div className="flow | quote">
        <p>
          It's time to set your lineup and choose your captain. In each match
          your midfield star value will be put up against the opponents
          midfield, plus 2 6 sided dice each! Your attack will play their
          defence and vice-versa in a best of three. Good luck out there ⚽
        </p>
        <p>
          During pre season you can also sell players but be careful, when
          they're gone they're gone!
        </p>
      </div>
      {validationMessage && <p className="error centre">{validationMessage}</p>}
      {isMatchDay && !team.isReady && !validationMessage && (
        <LoadingForm
          method="post"
          action={`/games/${game.id}/ready`}
          submitButtonText="Submit lineup"
          className="centre"
        />
      )}
      {isMatchDay && team.isReady && <div>Waiting for other players</div>}
      {canMakeChanges && (
        <LoadingForm
          method="post"
          action={`/games/${game.id}/captain`}
          className="flow | centre"
          onChange={(e) => submit(e.currentTarget, { replace: true })}
        >
          <div>
            <label htmlFor="captain">
              <div>Select a captain ({team.captainBoost}★ Boost)</div>
            </label>
            <select
              name="player-id"
              id="captain"
              value={captain?.id}
              onChange={() => {
                /* React wants an onChange since this is a controlled component, but really it's the <form> that uses the on change */
              }}
            >
              <option value="null">None</option>
              {players
                .filter((x) => x.lineupPosition)
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    [{x.position}] {x.name}
                  </option>
                ))}
            </select>
          </div>
          <input
            className="no-margin"
            type="hidden"
            name="existing-player-id"
            value={captain?.id}
          />
        </LoadingForm>
      )}

      <h3 className="centre">GKP</h3>
      <div className="players">
        <Position
          players={players}
          position={1}
          canMakeChanges={canMakeChanges}
        />
      </div>
      <h3 className="centre">DEF {scores.DEF}★ (incl. GKP)</h3>
      <div className="players">
        {[...Array(5).keys()].map((x) => (
          <Position
            key={`def-${x}`}
            players={players}
            position={x + 1 + 1}
            canMakeChanges={canMakeChanges}
          />
        ))}
      </div>
      <h3 className="centre">MID {scores.MID}★</h3>
      <div className="players">
        {[...Array(5).keys()].map((x) => (
          <Position
            key={`mid-${x}`}
            players={players}
            position={x + MAX_DEF_POSITION + 1}
            canMakeChanges={canMakeChanges}
          />
        ))}
      </div>
      <h3 className="centre">FWD {scores.FWD}★</h3>
      <div className="players">
        {[...Array(4).keys()].map((x) => (
          <Position
            key={`fwd-${x}`}
            players={players}
            position={x + MAX_MID_POSITION + 1}
            canMakeChanges={canMakeChanges}
          />
        ))}
      </div>
      <h3 className="centre">Reserves</h3>
      <div className="players squad-list">
        {players
          .filter((x) => x.lineupPosition === null)
          .map((x) => (
            <PlayerDisplay key={x.id} player={x}>
              {canSell && (
                <LoadingForm
                  method="post"
                  action={`/games/${game.id}/sell`}
                  submitButtonText={`Sell: ${getScoutPrice(
                    x.stars,
                    x.potential
                  )}M`}
                  buttonClass="mini-button xs-button-text button-secondary"
                >
                  <input type="hidden" name="player-id" value={x.id} />
                </LoadingForm>
              )}
            </PlayerDisplay>
          ))}
      </div>
    </>
  );
}

function Position({
  position,
  players,
  canMakeChanges,
}: {
  position: number;
  players: GamePlayer[];
  canMakeChanges: boolean;
}) {
  const existingPlayer = findPlayerInPosition(players, position);
  const previousPlayer = findPlayerInPosition(players, position - 1);
  const chemistry = existingPlayer
    ? hasChemistry(existingPlayer, previousPlayer)
    : false;
  return (
    <PlayerDisplay player={existingPlayer} hasChemistry={chemistry}>
      {canMakeChanges && (
        <PlayerSelection
          position={position}
          players={players}
          existingPlayer={existingPlayer}
        />
      )}
    </PlayerDisplay>
  );
}
