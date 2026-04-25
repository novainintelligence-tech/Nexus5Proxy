import { pgTable, text, integer, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const proxiesTable = pgTable(
  "proxies",
  {
    id: text("id").primaryKey(),
    ip: text("ip").notNull(),
    port: integer("port").notNull(),
    username: text("username").notNull(),
    password: text("password").notNull(),
    proxyType: text("proxy_type").notNull(), // 'residential' | 'datacenter' | 'mobile' | 'isp'
    country: text("country"),
    state: text("state"),
    city: text("city"),
    isp: text("isp"),
    latencyMs: integer("latency_ms"),
    status: text("status").notNull().default("working"), // 'working' | 'dead' | 'untested'
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    priceCents: integer("price_cents").notNull().default(150), // single-IP purchase price in cents
    isActive: boolean("is_active").notNull().default(true),
    isAssigned: boolean("is_assigned").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    ipPortUnique: uniqueIndex("proxies_ip_port_unique").on(table.ip, table.port),
  }),
);

export const insertProxySchema = createInsertSchema(proxiesTable).omit({ createdAt: true, updatedAt: true });
export type InsertProxy = z.infer<typeof insertProxySchema>;
export type Proxy = typeof proxiesTable.$inferSelect;
