import type { LinksFunction, LoaderFunction } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import styles from "./tailwind.css";
import { getUser } from "./utils/session.server";
import { authenticateUser } from "./middleware/auth.server";
import { csrfProtection, getSession, commitSession } from "~/utils/csrf.server";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
];

export const loader: LoaderFunction = async ({ request }) => {
  await authenticateUser(request);
  const user = await getUser(request);

  const session = await getSession(request.headers.get("Cookie"));
  const token = await csrfProtection.commitToken(session);

  return json(
    { user, csrfToken: token },
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    }
  );
};

export default function App() {
  const { user, csrfToken } = useLoaderData();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.csrfToken = ${JSON.stringify(csrfToken)};`,
          }}
        />
        <LiveReload />
      </body>
    </html>
  );
}