import { Link } from "@remix-run/react";
import type { Game } from "~/domain/games.server";
import type { Team } from "~/domain/team.server";
import { Stage } from "~/engine/game";

type PhaseSummaryProps = {
  game: Game;
  team?: Team;
};

export default function PhaseSummary({ game, team }: PhaseSummaryProps) {
  switch (game.stage) {
    case Stage.NotStarted:
      return <PhaseHeading heading="Waiting for Players" team={team} />;
    case Stage.Training:
      return (
        <PhaseHeading
          heading="Training Phase"
          callToAction="Go To Training"
          href={`/games/${game.id}/training`}
          team={team}
        />
      );
    case Stage.Scouting:
      return (
        <PhaseHeading
          heading="Scouting Phase"
          callToAction="Go To Scouting"
          href={`/games/${game.id}/scouting`}
          team={team}
        />
      );
    case Stage.Improvements:
      return (
        <PhaseHeading
          heading="Improvements Phase"
          callToAction="Improvements"
          href={`/games/${game.id}/improvements`}
          team={team}
        />
      );
    case Stage.DeadlineDay:
      return (
        <PhaseHeading
          heading="Who is up for grabs?"
          callToAction="Deadline Day"
          href={`/games/${game.id}/deadline-day`}
          team={team}
        />
      );
    case Stage.Match1:
      return (
        <PhaseHeading
          heading="Match Day 1"
          callToAction="Your lineup"
          href={`/games/${game.id}/team`}
          team={team}
        />
      );
    case Stage.Match2:
      return (
        <PhaseHeading
          heading="Match Day 2"
          callToAction="Your lineup"
          href={`/games/${game.id}/team`}
          team={team}
        />
      );
    case Stage.Match3:
      return (
        <PhaseHeading
          heading="Match Day 3"
          callToAction="Your lineup"
          href={`/games/${game.id}/team`}
          team={team}
        />
      );
    case Stage.Match4:
      return (
        <PhaseHeading
          heading="Match Day 4"
          callToAction="Your lineup"
          href={`/games/${game.id}/team`}
          team={team}
        />
      );
    case Stage.Match5:
      return (
        <PhaseHeading
          heading="Final Match Day"
          callToAction="Your lineup"
          href={`/games/${game.id}/team`}
          team={team}
        />
      );
    case Stage.CupQuarterFinal:
      return (
        <PhaseHeading
          heading="Cup Quarter Final"
          callToAction="Your lineup"
          href={`/games/${game.id}/team`}
          team={team}
        />
      );
    case Stage.CupSemiFinal:
      return (
        <PhaseHeading
          heading="Cup Semi Final"
          callToAction="Your lineup"
          href={`/games/${game.id}/team`}
          team={team}
        />
      );
    case Stage.CupFinal:
      return (
        <PhaseHeading
          heading="Cup Final!"
          callToAction="Your lineup"
          href={`/games/${game.id}/team`}
          team={team}
        />
      );
    default:
      throw new Error("Incorrect match stage");
  }
}

type PhaseProps = {
  heading: string;
  team?: Team;
  callToAction?: string;
  href?: string;
};

function PhaseHeading({ heading, team, callToAction, href }: PhaseProps) {
  return (
    <aside className="banner">
      <div className="wrapper | banner__text">
        <span>{heading}</span>
        {team && callToAction && href && (
          <Link to={href}>«{callToAction}»</Link>
        )}
      </div>
    </aside>
  );
}
