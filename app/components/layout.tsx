import { Link } from "@remix-run/react";
import type { Game } from "~/domain/games.server";
import { Stage } from "~/engine/game";
import PhaseSummary from "./phaseSummary";

export type LayoutProps = {
  game?: Game;
  children: React.ReactNode | React.ReactNode[];
};

export default function Layout({ game, children }: LayoutProps) {
  const gameStarted = game && game.stage !== Stage.NotStarted;
  return (
    <>
      <nav className="wrapper | header">
        <div className="header__left">
          <Link to={game ? `/games/${game.id}` : "/"}>Home</Link>
        </div>
        <div className="header__logo">
          <Link to="/">
            UBERCLUB
            <div className="header__logo-subtext">BY POST</div>
          </Link>
        </div>
        <div className="header__right">
          {game && gameStarted && (
            <Link to={game ? `/games/${game.id}/team` : "/"}>My Team</Link>
          )}
        </div>
      </nav>
      {game && gameStarted && <PhaseSummary game={game} />}
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
          <Link to={game ? `/games/${game.id}` : "/"}>Home</Link>
          {game && gameStarted && (
            <>
              <Link to={`/games/${game.id}/team`}>My Team</Link>
              <Link to={`/games/${game.id}/training`}>Training</Link>
              <Link to={`/games/${game.id}/scouting`}>Scouting</Link>
              <Link to={`/games/${game.id}/improvements`}>Improvements</Link>
              <Link to={`/games/${game.id}/deadline-day`}>Deadline day</Link>
            </>
          )}
        </div>
      </footer>
    </>
  );
}
