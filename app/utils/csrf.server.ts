import { createCookieSessionStorage } from "@remix-run/node";
import { csrf } from "@remix-run/node";

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__csrf",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET || "default_csrf_secret"],
    secure: process.env.NODE_ENV === "production",
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;

export const csrfProtection = csrf({
  getSession,
  cookieOptions: {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET || "default_csrf_secret"],
    secure: process.env.NODE_ENV === "production",
  },
});