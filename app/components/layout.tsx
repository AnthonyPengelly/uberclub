import { Form, Link } from "@remix-run/react";
import type { Game } from "~/domain/games.server";
import type { Team } from "~/domain/team.server";
import { Stage } from "~/engine/game";
import PhaseSummary from "./phaseSummary";

export type LayoutProps = {
  game?: Game;
  team?: Team;
  children: React.ReactNode | React.ReactNode[];
};

export default function Layout({ game, team, children }: LayoutProps) {
  const gameStarted = game && game.stage !== Stage.NotStarted;
  return (
    <>
      <nav className="wrapper | header">
        <div className="header__left">
          {game ? (
            <Link to={`/games/${game.id}`}>Dashboard</Link>
          ) : (
            <Link to="/">Home</Link>
          )}
        </div>
        <div className="header__logo">
          <Link to="/">
            UBERCLUB
            <div className="header__logo-subtext">BY POST</div>
          </Link>
        </div>
        <div className="header__right">
          {game && gameStarted && team && (
            <Link to={game ? `/games/${game.id}/team` : "/"}>My Team</Link>
          )}
        </div>
      </nav>
      {game && gameStarted && <PhaseSummary game={game} team={team} />}
      {(!game || !gameStarted) && <header className="header__separator" />}
      <main
        className={`flow wrapper ${
          game && gameStarted ? "main-height__in-game" : "main-height"
        }`}
      >
        {children}
      </main>
      <footer className="footer">
        <div className="wrapper horizontal-flow">
          <Link to="/">All Games</Link>
          {game ? (
            <Link to={`/games/${game.id}`}>Dashboard</Link>
          ) : (
            <Link to="/">Home</Link>
          )}
          {game && gameStarted && team && (
            <>
              <Link to={`/games/${game.id}/team`}>My Team</Link>
              <Link to={`/games/${game.id}/transfer-hub`}>Transfer hub</Link>
              <Link to={`/games/${game.id}/training`}>Training</Link>
              <Link to={`/games/${game.id}/scouting`}>Scouting</Link>
              <Link to={`/games/${game.id}/improvements`}>Improvements</Link>
              <Link to={`/games/${game.id}/deadline-day`}>Deadline day</Link>
            </>
          )}
          <Form method="post" action="/logout">
            <button className="as-anchor" type="submit">
              Logout
            </button>
          </Form>
        </div>
      </footer>
    </>
  );
}
