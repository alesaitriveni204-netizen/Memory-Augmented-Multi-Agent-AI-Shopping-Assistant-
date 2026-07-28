// Simple session helper — uses a single demo user (email-based).
// In a real app this would be NextAuth; for the demo we keep it lightweight.

import { db } from "@/lib/db";

const DEMO_EMAIL = "shopper@aishoppingos.dev";
const DEMO_NAME = "Alex Sharma";

export async function getOrCreateDemoUser() {
  let user = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!user) {
    user = await db.user.create({
      data: {
        email: DEMO_EMAIL,
        name: DEMO_NAME,
      },
    });
  }
  return user;
}

export async function getUserById(id: string) {
  return db.user.findUnique({ where: { id } });
}
