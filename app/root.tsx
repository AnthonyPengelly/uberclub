import type {
  LinksFunction,
  LoaderFunction,
  MetaFunction,
} from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Link,
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
} from "@remix-run/react";

import main from "./styles/main.css";
import reset from "./styles/reset.css";
import composition from "./styles/composition.css";
import utility from "./styles/utility.css";
import block from "./styles/block.css";
import exception from "./styles/exception.css";
import { getUser } from "./session.server";
import Layout from "./components/layout";

export const meta: MetaFunction = () => {
  return { title: "Uberclub By Post" };
};

export const links: LinksFunction = () => {
  return [
    { rel: "stylesheet", href: main },
    { rel: "stylesheet", href: reset },
    { rel: "stylesheet", href: composition },
    { rel: "stylesheet", href: utility },
    { rel: "stylesheet", href: block },
    { rel: "stylesheet", href: exception },
  ];
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
        <link
          rel="preload"
          href="//cdn.shopify.com/s/files/1/0407/3678/4540/t/9/assets/avertaregular.woff2?v=49235355855020092321654083099"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="//cdn.shopify.com/s/files/1/0407/3678/4540/t/9/assets/avertabold.woff2?v=14125607424772896621654083098"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
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

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link
          rel="preload"
          href="//cdn.shopify.com/s/files/1/0407/3678/4540/t/9/assets/avertaregular.woff2?v=49235355855020092321654083099"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="//cdn.shopify.com/s/files/1/0407/3678/4540/t/9/assets/avertabold.woff2?v=14125607424772896621654083098"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Layout>
          <h1>Something went wrong!</h1>
          <Link to="/">«Go back to game list»</Link>
        </Layout>
        <Scripts />
      </body>
    </html>
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link
          rel="preload"
          href="//cdn.shopify.com/s/files/1/0407/3678/4540/t/9/assets/avertaregular.woff2?v=49235355855020092321654083099"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="//cdn.shopify.com/s/files/1/0407/3678/4540/t/9/assets/avertabold.woff2?v=14125607424772896621654083098"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <Layout>
          <h1>
            {caught.status}: {caught.statusText}
          </h1>
          <Link to="/">«Go back to game list»</Link>
        </Layout>
        <Scripts />
      </body>
    </html>
  );
}
