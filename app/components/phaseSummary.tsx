import { Link } from "@remix-run/react";
import type { Game } from "~/domain/games.server";
import { Stage } from "~/engine/game";

type PhaseSummaryProps = {
  game: Game;
};

export default function PhaseSummary({ game }: PhaseSummaryProps) {
  switch (game.stage) {
    case Stage.NotStarted:
      return <PhaseHeading heading="Waiting for Players" />;
    case Stage.Training:
      return (
        <PhaseHeading
          heading="Training Phase"
          callToAction="Go To Training"
          href={`/games/${game.id}/training`}
        />
      );
    case Stage.Scouting:
      return (
        <PhaseHeading
          heading="Scouting Phase"
          callToAction="Go To Scouting"
          href={`/games/${game.id}/scouting`}
        />
      );
    case Stage.Investments:
      return (
        <PhaseHeading
          heading="Investments Phase"
          callToAction="Go To Investments"
          href={`/games/${game.id}/investments`}
        />
      );
    case Stage.DeadlineDay:
      return (
        <PhaseHeading
          heading="It's Deadline Day!"
          callToAction="Check out who is up for grabs"
          href={`/games/${game.id}/deadline-day`}
        />
      );
    case Stage.Match1:
      return (
        <PhaseHeading
          heading="Match Day 1"
          callToAction="Get Your Team Ready"
          href={`/games/${game.id}/team`}
        />
      );
    case Stage.Match2:
      return (
        <PhaseHeading
          heading="Match Day 2"
          callToAction="Get Your Team Ready"
          href={`/games/${game.id}/team`}
        />
      );
    case Stage.Match3:
      return (
        <PhaseHeading
          heading="Final Match Day"
          callToAction="Get Your Team Ready"
          href={`/games/${game.id}/team`}
        />
      );
    case Stage.SuperCup:
      return (
        <PhaseHeading
          heading="Who knows how this works!"
          callToAction="Get Your Team Ready"
          href={`/games/${game.id}/team`}
        />
      );
    default:
      throw new Error("Incorrect match stage");
  }
}

type PhaseProps = {
  heading: string;
  callToAction?: string;
  href?: string;
};

function PhaseHeading({ heading, callToAction, href }: PhaseProps) {
  return (
    <div>
      <h3>{heading}</h3>
      {callToAction && href && <Link to={href}>{callToAction}</Link>}
    </div>
  );
}
