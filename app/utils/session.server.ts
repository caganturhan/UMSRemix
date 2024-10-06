import bcrypt from "bcryptjs";
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { prisma } from "./db.server";
import jwt from "jsonwebtoken";
import { logger } from "./logger.server";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || "default_access_token_secret";
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "default_refresh_token_secret";

const ACCESS_TOKEN_EXPIRATION = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRATION = "7d"; // 7 days

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET || "default_session_secret"],
    secure: process.env.NODE_ENV === "production",
  },
});

function generateAccessToken(userId: string) {
  return jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRATION });
}

function generateRefreshToken(userId: string) {
  return jwt.sign({ userId }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRATION });
}

export async function createUserSession(userId: string, redirectTo: string) {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  const session = await sessionStorage.getSession();
  session.set("accessToken", accessToken);

  // Store refresh token in the database
  await prisma.user.update({
    where: { id: userId },
    data: {
      refreshToken,
      refreshTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
  });

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function getUserFromSession(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const accessToken = session.get("accessToken");

  if (!accessToken) return null;

  try {
    const payload = jwt.verify(accessToken, ACCESS_TOKEN_SECRET) as { userId: string };
    return payload.userId;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

export async function refreshAccessToken(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || !user.refreshToken || !user.refreshTokenExpires || user.refreshTokenExpires < new Date()) {
    return null;
  }

  try {
    jwt.verify(user.refreshToken, REFRESH_TOKEN_SECRET);
    const newAccessToken = generateAccessToken(userId);
    return newAccessToken;
  } catch (error) {
    return null;
  }
}

export async function logout(request: Request) {
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const userId = await getUserFromSession(request);

  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null, refreshTokenExpires: null },
    });
  }

  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

export async function login({ email, password }: { email: string; password: string }) {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) return null;

  // Check if the account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingLockTime = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new Error(`Account is locked. Please try again in ${remainingLockTime} minutes.`);
  }

  const isCorrectPassword = await bcrypt.compare(password, user.password);
  
  if (!isCorrectPassword) {
    // Increment login attempts
    const updatedAttempts = user.loginAttempts + 1;
    
    if (updatedAttempts >= 5) {
      // Lock the account for 15 minutes
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockedUntil },
      });
      logger.warn(`Account locked for user: ${user.email}`);
      throw new Error("Account locked. Please try again in 15 minutes.");
    } else {
      // Update login attempts
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: updatedAttempts },
      });
    }
    return null;
  }

  // Reset login attempts on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: { loginAttempts: 0, lockedUntil: null },
  });

  return { id: user.id, email: user.email };
}

export async function requireUser(request: Request) {
  const userId = await getUserFromSession(request);

  if (!userId) {
    throw redirect("/login");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw redirect("/login");
  }

  return user;
}