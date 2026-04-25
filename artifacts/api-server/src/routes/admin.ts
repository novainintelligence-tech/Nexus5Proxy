import { Router } from "express";
import {
  db, usersTable, paymentsTable, plansTable,
  subscriptionsTable, proxiesTable, userProxiesTable
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { getCryptoAmount, CRYPTO_WALLETS } from "../lib/crypto-wallets";
import { generateId } from "../lib/id";
import { logger } from "../lib/logger";

const router = Router();

// ── Stats ──────────────────────────────────────────────────────────────────
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const [{ count: totalUsers }] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [{ count: activeSubscriptions }] = await db.select({ count: sql<number>`count(*)` })
    .from(subscriptionsTable).where(eq(subscriptionsTable.status, "active"));
  const [{ count: pendingPayments }] = await db.select({ count: sql<number>`count(*)` })
    .from(paymentsTable).where(eq(paymentsTable.status, "pending"));
  const [{ count: totalProxies }] = await db.select({ count: sql<number>`count(*)` }).from(proxiesTable);
  const [{ count: assignedProxies }] = await db.select({ count: sql<number>`count(*)` })
    .from(proxiesTable).where(eq(proxiesTable.isAssigned, true));
  const confirmedPayments = await db.select({ amt: paymentsTable.amountUsd })
    .from(paymentsTable).where(eq(paymentsTable.status, "confirmed"));
  const totalRevenueCents = confirmedPayments.reduce((a, p) => a + p.amt, 0);

  res.json({
    totalUsers: Number(totalUsers),
    activeSubscriptions: Number(activeSubscriptions),
    pendingPayments: Number(pendingPayments),
    totalProxies: Number(totalProxies),
    assignedProxies: Number(assignedProxies),
    totalRevenueCents,
  });
});

// ── Users ──────────────────────────────────────────────────────────────────
router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  res.json(users);
});

router.patch("/admin/users/:id/ban", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { isBanned } = req.body;
  if (typeof isBanned !== "boolean") { res.status(400).json({ error: "isBanned boolean required" }); return; }

  const [updated] = await db.update(usersTable)
    .set({ isBanned })
    .where(eq(usersTable.id, rawId))
    .returning();

  if (!updated) { res.status(404).json({ error: "User not found" }); return; }
  res.json(updated);
});

// ── Payments ───────────────────────────────────────────────────────────────
router.get("/admin/payments", requireAdmin, async (_req, res): Promise<void> => {
  const payments = await db
    .select({
      id: paymentsTable.id,
      userId: paymentsTable.userId,
      userEmail: usersTable.email,
      planId: paymentsTable.planId,
      planName: plansTable.name,
      amountUsd: paymentsTable.amountUsd,
      currency: paymentsTable.currency,
      txHash: paymentsTable.txHash,
      status: paymentsTable.status,
      adminNote: paymentsTable.adminNote,
      createdAt: paymentsTable.createdAt,
    })
    .from(paymentsTable)
    .leftJoin(usersTable, eq(paymentsTable.userId, usersTable.id))
    .leftJoin(plansTable, eq(paymentsTable.planId, plansTable.id))
    .orderBy(paymentsTable.createdAt);
  res.json(payments);
});

router.patch("/admin/payments/:id/confirm", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { adminNote } = req.body;

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, rawId)).limit(1);
  if (!payment) { res.status(404).json({ error: "Payment not found" }); return; }
  if (payment.status === "confirmed") { res.status(400).json({ error: "Already confirmed" }); return; }

  const now = new Date();

  // ── Cart-purchase flow ─────────────────────────────────────────────────
  // Cart purchases use planId="cart" and have a pre-created pending subscription
  // + pre-assigned (inactive) user_proxies rows. We just flip them on.
  if (payment.planId === "cart") {
    const [updatedPayment] = await db.update(paymentsTable)
      .set({ status: "confirmed", confirmedAt: now, adminNote: adminNote ?? null })
      .where(eq(paymentsTable.id, rawId))
      .returning();

    const [pendingSub] = await db.select().from(subscriptionsTable)
      .where(eq(subscriptionsTable.paymentId, rawId)).limit(1);

    if (pendingSub) {
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await db.update(subscriptionsTable)
        .set({ status: "active", startsAt: now, expiresAt })
        .where(eq(subscriptionsTable.id, pendingSub.id));
      await db.update(userProxiesTable)
        .set({ isActive: true })
        .where(eq(userProxiesTable.subscriptionId, pendingSub.id));
      logger.info({ paymentId: rawId, subscriptionId: pendingSub.id }, "Cart payment confirmed");
    }
    res.json(updatedPayment);
    return;
  }

  // ── Standard plan-purchase flow ────────────────────────────────────────
  const [plan] = await db.select().from(plansTable).where(eq(plansTable.id, payment.planId)).limit(1);
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }

  const expiresAt = new Date(now.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

  const [updatedPayment] = await db.update(paymentsTable)
    .set({ status: "confirmed", confirmedAt: now, adminNote: adminNote ?? null })
    .where(eq(paymentsTable.id, rawId))
    .returning();

  const [existingSub] = await db.select().from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, payment.userId), eq(subscriptionsTable.paymentId, rawId)))
    .limit(1);

  let subscriptionId: string;
  if (existingSub) {
    await db.update(subscriptionsTable)
      .set({ status: "active", startsAt: now, expiresAt, bandwidthUsedMb: 0 })
      .where(eq(subscriptionsTable.id, existingSub.id));
    subscriptionId = existingSub.id;
  } else {
    const [sub] = await db.insert(subscriptionsTable).values({
      id: generateId("sub"),
      userId: payment.userId,
      planId: payment.planId,
      paymentId: rawId,
      status: "active",
      bandwidthGbTotal: plan.bandwidthGb,
      bandwidthUsedMb: 0,
      startsAt: now,
      expiresAt,
    }).returning();
    subscriptionId = sub.id;
  }

  const neededCount = plan.proxyCount;
  const availableProxies = await db.select().from(proxiesTable)
    .where(and(eq(proxiesTable.isActive, true), eq(proxiesTable.isAssigned, false)))
    .limit(neededCount);

  for (const proxy of availableProxies) {
    await db.insert(userProxiesTable).values({
      id: generateId("up"),
      userId: payment.userId,
      proxyId: proxy.id,
      subscriptionId,
      isActive: true,
    });
    await db.update(proxiesTable).set({ isAssigned: true }).where(eq(proxiesTable.id, proxy.id));
  }

  logger.info({ paymentId: rawId, subscriptionId, proxiesAssigned: availableProxies.length }, "Payment confirmed");

  res.json(updatedPayment);
});

// ── Proxies ─────────────────────────────────────────────────────────────────
router.get("/admin/proxies", requireAdmin, async (_req, res): Promise<void> => {
  const proxies = await db.select().from(proxiesTable);
  res.json(proxies);
});

router.post("/admin/proxies", requireAdmin, async (req, res): Promise<void> => {
  const { ip, port, username, password, proxyType, country } = req.body;
  if (!ip || !port || !username || !password || !proxyType) {
    res.status(400).json({ error: "ip, port, username, password, proxyType required" }); return;
  }
  const [proxy] = await db.insert(proxiesTable).values({
    id: generateId("prx"),
    ip, port: Number(port), username, password, proxyType,
    country: country ?? null,
  }).returning();
  res.status(201).json(proxy);
});

router.post("/admin/proxies/bulk", requireAdmin, async (req, res): Promise<void> => {
  const { proxyList, proxyType } = req.body;
  if (!proxyList || !proxyType) { res.status(400).json({ error: "proxyList and proxyType required" }); return; }

  const lines = (proxyList as string).split("\n").map((l: string) => l.trim()).filter(Boolean);
  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const line of lines) {
    const parts = line.split(":");
    if (parts.length < 4) { errors.push(`Invalid format: ${line}`); skipped++; continue; }
    const [ip, portStr, username, password] = parts;
    const port = parseInt(portStr, 10);
    if (isNaN(port)) { errors.push(`Invalid port: ${line}`); skipped++; continue; }
    try {
      await db.insert(proxiesTable).values({
        id: generateId("prx"), ip, port, username, password, proxyType,
      });
      added++;
    } catch (e: any) {
      errors.push(`Error adding ${line}: ${e.message}`);
      skipped++;
    }
  }
  res.status(201).json({ added, skipped, errors });
});

router.delete("/admin/proxies/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  await db.update(proxiesTable).set({ isActive: false }).where(eq(proxiesTable.id, rawId));
  res.json({ ok: true });
});

// ── Plans ───────────────────────────────────────────────────────────────────
router.post("/admin/plans", requireAdmin, async (req, res): Promise<void> => {
  const { id, name, description, planType, priceUsd, bandwidthGb, proxyCount, durationDays, proxyTypes, features } = req.body;
  if (!id || !name || !planType || !priceUsd || !bandwidthGb || !durationDays) {
    res.status(400).json({ error: "Required fields missing" }); return;
  }
  const [plan] = await db.insert(plansTable).values({
    id, name, description: description ?? null,
    planType, priceUsd, bandwidthGb,
    proxyCount: proxyCount ?? 1,
    durationDays,
    proxyTypes: proxyTypes ?? ["residential"],
    features: features ?? [],
  }).returning();
  res.status(201).json(plan);
});

export default router;
