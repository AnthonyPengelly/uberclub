import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Form,
  Link,
  useLoaderData,
  useSubmit,
  useTransition,
} from "@remix-run/react";
import type { Team } from "~/domain/team.server";
import { getTeam } from "~/domain/team.server";
import { requireUserId } from "~/session.server";
import invariant from "tiny-invariant";
import type { GamePlayer } from "~/domain/players.server";
import { getTeamPlayers } from "~/domain/players.server";
import type { Game } from "~/domain/games.server";
import { getGame } from "~/domain/games.server";
import {
  findPlayerInPosition,
  getLineupScores,
  getChemistry,
  MAX_DEF_POSITION,
  MAX_MID_POSITION,
  updatePlayerPosition,
  validateLineup,
} from "~/engine/lineup";
import { overrideGameStageWithTeam, Stage } from "~/engine/game";
import PlayerDisplay from "~/components/playerDisplay";
import LoadingForm from "~/components/loadingForm";
import { MAX_SQUAD_SIZE, updatePlayersBasedOnFormData } from "~/engine/team";
import { useState } from "react";

type LoaderData = {
  team: Team;
  players: GamePlayer[];
  game: Game;
};

type SelectedPlayerPosition = {
  id: string | undefined;
  position: number | undefined;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");

  const team = await getTeam(userId, params.gameId);
  const players = await getTeamPlayers(team.id);
  const game = await getGame(params.gameId);
  overrideGameStageWithTeam(game, team);
  if (!team) {
    throw new Response("Not Found", { status: 404 });
  }

  return json({ team, players, game });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  invariant(params.gameId, "gameId not found");
  const game = await getGame(params.gameId);
  const team = await getTeam(userId, params.gameId);
  overrideGameStageWithTeam(game, team);
  const formData = await request.formData();
  const player1Id = formData.get("player1-id") as string;
  const position1 = parseInt(formData.get("position1") as string, 10);
  const player2Id = formData.get("player2-id") as string;
  const position2 = parseInt(formData.get("position2") as string, 10);

  if (player1Id) {
    await updatePlayerPosition(player1Id, position2);
  }

  if (player2Id) {
    await updatePlayerPosition(player2Id, position1);
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
  const [selectedPlayerPosition, setSelectedPlayerPosition] =
    useState<SelectedPlayerPosition>();
  if (
    submission &&
    (submission.formData.get("position1") ||
      submission.formData.get("position2"))
  ) {
    updatePlayersBasedOnFormData(players, submission.formData);
  }
  const scores = getLineupScores(players, team.captainBoost);
  const validationMessage = validateLineup(players);
  const isMatchDay =
    game.stage === Stage.Match1 ||
    game.stage === Stage.Match2 ||
    game.stage === Stage.Match3 ||
    game.stage === Stage.Match4 ||
    game.stage === Stage.Match5 ||
    game.stage === Stage.CupQuarterFinal ||
    game.stage === Stage.CupSemiFinal ||
    game.stage === Stage.CupFinal;
  const canMakeChanges = !team.isReady || !isMatchDay;
  const captain = players.find((x) => x.captain);

  return (
    <>
      <h1>{team.teamName} lineup</h1>
      <div>
        {players.length}/{MAX_SQUAD_SIZE} players in squad
        <br />
        Check out the{" "}
        <Link to={`/games/${game.id}/transfer-hub`}>«Transfer hub»</Link> to buy
        and sell players.
      </div>
      <div className="flow | quote">
        <p>
          It's time to set your lineup and choose your captain. In each match
          your midfield star value will be put up against the opponents
          midfield, plus a 6 sided dice each (add another roll if you get a six,
          though you might pick up an injury)! Your attack will play their
          defence and vice-versa in a best of three. Good luck out there ⚽
        </p>
        <p>
          🧪 You can gain extra stars by positioning players of the same team
          next to each other 🧪
        </p>
        <p>
          Simply click a player or position, and then click another
          player/position to swap them.
        </p>
      </div>
      {validationMessage && <p className="error">{validationMessage}</p>}
      {canMakeChanges && (
        <div className="horizontal-flow">
          {isMatchDay && !team.isReady && !validationMessage && (
            <LoadingForm
              method="post"
              action={`/games/${game.id}/ready`}
              submitButtonText="Submit lineup"
            />
          )}
          <LoadingForm
            method="post"
            action={`/games/${game.id}/auto-pick`}
            submitButtonText="Auto-pick"
            buttonClass="button-secondary"
          />
        </div>
      )}
      {isMatchDay && team.isReady && <div>Waiting for other players</div>}
      {canMakeChanges && (
        <LoadingForm
          method="post"
          action={`/games/${game.id}/captain`}
          className="flow"
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
      <div className="lineup">
        <div className="lineup-segment">
          <div className="lineup-segment__summary">{scores.DEF}★</div>
          <div className="players margin-bottom">
            <Position
              players={players}
              position={1}
              canMakeChanges={canMakeChanges}
              selectedPlayerPosition={selectedPlayerPosition}
              setSelectedPlayerPosition={setSelectedPlayerPosition}
            />
          </div>
          <div className="players">
            {[...Array(5).keys()].map((x) => (
              <Position
                key={`def-${x}`}
                players={players}
                position={x + 1 + 1}
                canMakeChanges={canMakeChanges}
                selectedPlayerPosition={selectedPlayerPosition}
                setSelectedPlayerPosition={setSelectedPlayerPosition}
              />
            ))}
          </div>
        </div>
        <div className="lineup-segment">
          <div className="lineup-segment__summary">{scores.MID}★</div>
          <div className="players">
            {[...Array(5).keys()].map((x) => (
              <Position
                key={`mid-${x}`}
                players={players}
                position={x + MAX_DEF_POSITION + 1}
                canMakeChanges={canMakeChanges}
                selectedPlayerPosition={selectedPlayerPosition}
                setSelectedPlayerPosition={setSelectedPlayerPosition}
              />
            ))}
          </div>
        </div>
        <div className="lineup-segment">
          <div className="lineup-segment__summary">{scores.FWD}★</div>
          <div className="players">
            {[...Array(5).keys()].map((x) => (
              <Position
                key={`fwd-${x}`}
                players={players}
                position={x + MAX_MID_POSITION + 1}
                canMakeChanges={canMakeChanges}
                selectedPlayerPosition={selectedPlayerPosition}
                setSelectedPlayerPosition={setSelectedPlayerPosition}
              />
            ))}
          </div>
        </div>
      </div>
      <h3 className="centre">Reserves</h3>
      <div className="players squad-list">
        {players
          .filter((x) => x.lineupPosition === null)
          .map((x) => (
            <WithSelection
              key={x.id}
              selectedPlayerPosition={selectedPlayerPosition}
              setSelectedPlayerPosition={setSelectedPlayerPosition}
              enabled={canMakeChanges && !x.injured}
              playerId={x.id}
              position={undefined}
            >
              <PlayerDisplay player={x} />
            </WithSelection>
          ))}
        {selectedPlayerPosition?.position && (
          <WithSelection
            selectedPlayerPosition={selectedPlayerPosition}
            setSelectedPlayerPosition={setSelectedPlayerPosition}
            enabled={canMakeChanges}
            playerId={undefined}
            position={undefined}
          >
            <PlayerDisplay
              player={undefined}
              noPlayerText="Move to bench"
            ></PlayerDisplay>
          </WithSelection>
        )}
      </div>
    </>
  );
}

function Position({
  position,
  players,
  canMakeChanges,
  selectedPlayerPosition,
  setSelectedPlayerPosition,
}: {
  position: number;
  players: GamePlayer[];
  canMakeChanges: boolean;
  selectedPlayerPosition: SelectedPlayerPosition | undefined;
  setSelectedPlayerPosition: (id: SelectedPlayerPosition | undefined) => void;
}) {
  const existingPlayer = findPlayerInPosition(players, position);
  // Match the GKP to position 4, the middle defender
  const previousPlayer = findPlayerInPosition(players, position === 1 ? 4 : position - 1);
  const chemistry = existingPlayer
    ? getChemistry(existingPlayer, previousPlayer)
    : 0;
  return (
    <WithSelection
      enabled={canMakeChanges && !existingPlayer?.injured}
      selectedPlayerPosition={selectedPlayerPosition}
      setSelectedPlayerPosition={setSelectedPlayerPosition}
      playerId={existingPlayer?.id}
      position={position}
    >
      <PlayerDisplay player={existingPlayer} chemistry={chemistry} />
    </WithSelection>
  );
}

function WithSelection({
  children,
  selectedPlayerPosition,
  setSelectedPlayerPosition,
  playerId,
  position,
  enabled,
}: {
  children: React.ReactNode | React.ReactNode[];
  selectedPlayerPosition: SelectedPlayerPosition | undefined;
  setSelectedPlayerPosition: (id: SelectedPlayerPosition | undefined) => void;
  playerId: string | undefined;
  position: number | undefined;
  enabled: boolean;
}) {
  if (!enabled) {
    return <>{children}</>;
  }
  if (selectedPlayerPosition) {
    return (
      <Form
        method="post"
        onSubmit={() => {
          setSelectedPlayerPosition(undefined);
        }}
        className="wrapper-form"
        data-selected-player={
          selectedPlayerPosition.id === playerId &&
          selectedPlayerPosition.position === position
        }
      >
        <input type="hidden" name="player1-id" value={playerId} />
        <input type="hidden" name="position1" value={position} />
        <input
          type="hidden"
          name="player2-id"
          value={selectedPlayerPosition.id}
        />
        <input
          type="hidden"
          name="position2"
          value={selectedPlayerPosition.position}
        />
        <button className="wrapper-button" type="submit">
          {children}
        </button>
      </Form>
    );
  }
  return (
    <button
      className="wrapper-button"
      onClick={(e) => {
        setSelectedPlayerPosition({ id: playerId, position });
      }}
    >
      {children}
    </button>
  );
}
