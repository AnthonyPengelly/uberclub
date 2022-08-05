import type {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";

import stylesheet from "./styles/main.css";
import { getUser } from "./session.server";

export const meta: MetaFunction = () => {
  return { title: "Uberclub By Post" };
};

export const links: LinksFunction = () => {
  return [{ rel: "stylesheet", href: stylesheet }];
};

export const loader: LoaderFunction = async ({ request }) => {
  return json({
    user: await getUser(request),
  });
};

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}
