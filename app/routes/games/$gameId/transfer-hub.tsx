import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { NavLink, Outlet, useLoaderData } from "@remix-run/react";
import invariant from "tiny-invariant";

type LoaderData = {
  gameId: string;
};

export const loader: LoaderFunction = async ({ request, params }) => {
  invariant(params.gameId, "gameId not found");

  return json({ gameId: params.gameId });
};

export default function TransferHubPage() {
  const { gameId } = useLoaderData<LoaderData>();

  return (
    <>
      <h1>Transfer hub</h1>
      <div className="tabs">
        <NavLink
          to={`/games/${gameId}/transfer-hub`}
          className={({ isActive }) => `${isActive ? "active" : ""}`}
          end
        >
          Offers
        </NavLink>
        <NavLink
          to={`/games/${gameId}/transfer-hub/players`}
          className={({ isActive }) => `${isActive ? "active" : ""}`}
        >
          Players
        </NavLink>
        <NavLink
          to={`/games/${gameId}/transfer-hub/sell`}
          className={({ isActive }) => `${isActive ? "active" : ""}`}
        >
          Sell
        </NavLink>
      </div>
      <Outlet />
    </>
  );
}
