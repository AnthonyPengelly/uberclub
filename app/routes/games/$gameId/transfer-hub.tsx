import type { LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Link, Outlet, useLoaderData } from "@remix-run/react";
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
        <Link to={`/games/${gameId}/transfer-hub`}>Offers</Link>
        <Link to={`/games/${gameId}/transfer-hub/buy`}>Buy</Link>
        <Link to={`/games/${gameId}/transfer-hub/sell`}>Sell</Link>
      </div>
      <Outlet />
    </>
  );
}
