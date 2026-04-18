import { Router } from "express";
import { db, userProxiesTable, proxiesTable, subscriptionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, getDbUser } from "../lib/auth";

const router = Router();

router.get("/proxies/my", requireAuth, async (req, res): Promise<void> => {
  const clerkId = (req as any).clerkUserId;
  const user = await getDbUser(clerkId);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const proxies = await db
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
      eq(userProxiesTable.userId, user.id),
      eq(userProxiesTable.isActive, true),
    ));

  res.json(proxies);
});

export default router;
