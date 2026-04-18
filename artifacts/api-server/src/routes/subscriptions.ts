import { Router } from "express";
import { db, subscriptionsTable, plansTable, userProxiesTable, proxiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getDbUser } from "../lib/auth";

const router = Router();

router.get("/subscriptions", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const subs = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, user.id));
  res.json(subs);
});

router.get("/subscriptions/active", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const now = new Date();
  const [sub] = await db.select().from(subscriptionsTable)
    .where(and(
      eq(subscriptionsTable.userId, user.id),
      eq(subscriptionsTable.status, "active"),
    ))
    .orderBy(subscriptionsTable.expiresAt)
    .limit(1);

  if (!sub) { res.status(404).json({ error: "No active subscription" }); return; }

  // Check if expired
  if (sub.expiresAt && sub.expiresAt < now) {
    await db.update(subscriptionsTable)
      .set({ status: "expired" })
      .where(eq(subscriptionsTable.id, sub.id));
    res.status(404).json({ error: "No active subscription" });
    return;
  }

  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, sub.planId)).limit(1);
  const userProxies = await db
    .select({
      id: userProxiesTable.id,
      proxyId: userProxiesTable.proxyId,
      ip: proxiesTable.ip,
      port: proxiesTable.port,
      username: proxiesTable.username,
      password: proxiesTable.password,
      proxyType: proxiesTable.proxyType,
      country: proxiesTable.country,
      isActive: userProxiesTable.isActive,
      assignedAt: userProxiesTable.assignedAt,
    })
    .from(userProxiesTable)
    .leftJoin(proxiesTable, eq(userProxiesTable.proxyId, proxiesTable.id))
    .where(and(
      eq(userProxiesTable.subscriptionId, sub.id),
      eq(userProxiesTable.isActive, true),
    ));

  const remainingHours = sub.expiresAt
    ? Math.max(0, (sub.expiresAt.getTime() - now.getTime()) / 3600000)
    : null;

  const bandwidthRemainingMb = sub.bandwidthGbTotal * 1024 - sub.bandwidthUsedMb;

  res.json({
    subscription: sub,
    plan,
    proxies: userProxies,
    remainingHours,
    bandwidthRemainingMb,
  });
});

export default router;
