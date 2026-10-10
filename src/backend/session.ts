import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "shopditto_session";
const SESSION_SECONDS = 60 * 60 * 24;
const REMEMBERED_SESSION_SECONDS = SESSION_SECONDS * 30;
const scryptAsync = promisify(scrypt) as (password: string, salt: string, keyLength: number) => Promise<Buffer>;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)).toString("hex");
  return `scrypt:${salt}:${derived}`;
}

export async function verifyPassword(password: string, storedHash: string | null) {
  if (!storedHash) return false;
  const [algorithm, salt, hash] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  if (expected.length === 0) return false;
  const actual = await scryptAsync(password, salt, expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAuthSession(userId: string, remember = true) {
  const token = randomBytes(32).toString("base64url");
  const maxAge = remember ? REMEMBERED_SESSION_SECONDS : SESSION_SECONDS;
  const expiresAt = new Date(Date.now() + maxAge * 1000);
  await db.authSession.create({
    data: { userId, tokenHash: hashToken(token), expiresAt },
  });
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await db.authSession.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.authSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  return user;
}

// Kept as the existing API import name; it now resolves the signed-in account.
export const getOrCreateDemoUser = requireAuthenticatedUser;

export async function getUserById(id: string) {
  return db.user.findUnique({ where: { id } });
}
