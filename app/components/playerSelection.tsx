import { useRef, useState } from "react";
import type { GamePlayer } from "~/domain/players.server";
import type { LineupPlayer } from "~/engine/lineup";
import LoadingForm from "./loadingForm";
import PlayerDisplay from "./playerDisplay";

export type PlayerSelectionProps = {
  position: number;
  players: GamePlayer[];
  existingPlayer: LineupPlayer | undefined;
};

export default function PlayerSelection({
  position,
  players,
  existingPlayer,
}: PlayerSelectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);
  return (
    <>
      <button
        className="button mini-button button-secondary"
        onClick={() => setIsOpen(true)}
      >
        Replace
      </button>
      {isOpen && (
        <div
          className="flow | player-selection"
          onClick={(e) => {
            if (ref.current === e.target) {
              setIsOpen(false);
            }
          }}
          ref={ref}
        >
          <button
            className="button button-secondary"
            onClick={() => setIsOpen(false)}
          >
            Close X
          </button>
          <div className="wrapper | players squad-list">
            {/* Undefined provides "remove this player" functionality */}
            {[undefined, ...players].map((x) => (
              <PlayerDisplay key={x?.id || "no-player"} player={x}>
                <LoadingForm
                  method="post"
                  buttonClass="mini-button button-secondary"
                  submitButtonText="Select"
                  onSubmit={() => setIsOpen(false)}
                >
                  <input
                    type="hidden"
                    name="existing-player-id"
                    value={existingPlayer?.id}
                  />
                  <input type="hidden" name="player-id" value={x?.id} />
                  <input type="hidden" name="position" value={position} />
                </LoadingForm>
              </PlayerDisplay>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
