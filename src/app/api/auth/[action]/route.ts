import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createAuthSession,
  getAuthenticatedUser,
  hashPassword,
  hashToken,
  revokeCurrentSession,
  verifyPassword,
} from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailSchema = z.string().trim().email().max(254).transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(10).max(128).regex(/[A-Za-z]/).regex(/[0-9]/);
const userResponse = (user: { id: string; name: string; email: string; personaCluster: string | null; twinConfidence: number; memoryEnabled: boolean; personalizationEnabled: boolean; onboardingCompleted: boolean }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  personaCluster: user.personaCluster,
  twinConfidence: user.twinConfidence,
  memoryEnabled: user.memoryEnabled,
  personalizationEnabled: user.personalizationEnabled,
  hasOnboarded: user.onboardingCompleted,
});

type Context = { params: Promise<{ action: string }> };

export async function GET(_request: Request, context: Context) {
  const { action } = await context.params;
  if (action !== "me") return NextResponse.json({ error: "Not found" }, { status: 404 });
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: userResponse(user) });
}

export async function POST(request: Request, context: Context) {
  const { action } = await context.params;
  if (action === "logout") {
    await revokeCurrentSession();
    return NextResponse.json({ success: true });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (action === "signup") {
    const parsed = z.object({
      name: z.string().trim().min(2).max(80),
      email: emailSchema,
      password: passwordSchema,
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Enter a name, valid email, and password with at least 10 characters including a number." }, { status: 400 });
    try {
      const user = await db.user.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash: await hashPassword(parsed.data.password),
        },
      });
      await createAuthSession(user.id, true);
      return NextResponse.json({ user: userResponse(user) }, { status: 201 });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
        return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
      }
      console.error("[auth/signup]", error);
      return NextResponse.json({ error: "Could not create your account." }, { status: 500 });
    }
  }

  if (action === "login") {
    const parsed = z.object({
      email: emailSchema,
      password: z.string().min(1).max(128),
      remember: z.boolean().optional(),
    }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }
    await createAuthSession(user.id, parsed.data.remember ?? false);
    return NextResponse.json({ user: userResponse(user) });
  }

  if (action === "forgot-password") {
    const parsed = z.object({ email: emailSchema }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    const user = await db.user.findUnique({ where: { email: parsed.data.email } });
    let developmentResetUrl: string | undefined;
    if (user) {
      const token = randomBytes(32).toString("base64url");
      await db.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await db.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
      const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? new URL(request.url).origin;
      const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(token)}`;
      if (process.env.RESEND_API_KEY && process.env.AUTH_FROM_EMAIL) {
        const sent = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.AUTH_FROM_EMAIL,
            to: [user.email],
            subject: "Reset your shopDitto password",
            html: `<p>Use this one-time link to reset your shopDitto password. It expires in one hour.</p><p><a href="${resetUrl}">Reset password</a></p>`,
          }),
        });
        if (!sent.ok) console.error("[auth/forgot-password] email provider rejected the reset email");
      } else if (process.env.NODE_ENV !== "production") {
        developmentResetUrl = resetUrl;
      } else {
        console.error("[auth/forgot-password] Configure RESEND_API_KEY and AUTH_FROM_EMAIL to deliver password reset links.");
      }
    }
    return NextResponse.json({ success: true, message: "If an account exists for this email, a reset link has been sent.", developmentResetUrl });
  }

  if (action === "reset-password") {
    const parsed = z.object({ token: z.string().min(20), password: passwordSchema }).safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Use a valid reset link and a password of at least 10 characters including a number." }, { status: 400 });
    const reset = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(parsed.data.token) } });
    if (!reset || reset.expiresAt <= new Date()) return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
    const passwordHash = await hashPassword(parsed.data.password);
    await db.$transaction([
      db.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      db.passwordResetToken.deleteMany({ where: { userId: reset.userId } }),
      db.authSession.deleteMany({ where: { userId: reset.userId } }),
    ]);
    await revokeCurrentSession();
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Not found" }, { status: 404 });
}