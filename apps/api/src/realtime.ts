import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import type { Server } from "socket.io";
import { pool, transaction } from "./db";
export const redis = createClient({
  url: process.env.REDIS_URL ?? "redis://127.0.0.1:56379",
  disableOfflineQueue: true,
});
const adapterSub = redis.duplicate(),
  changesSub = redis.duplicate();
for (const client of [redis, adapterSub, changesSub])
  client.on("error", (e) => console.error("Redis:", e.message));
export async function connectRedis() {
  await Promise.all([
    redis.connect(),
    adapterSub.connect(),
    changesSub.connect(),
  ]);
}
export async function closeRedis() {
  for (const c of [changesSub, adapterSub, redis]) if (c.isOpen) c.destroy();
}
const channel = "quizwerk:room-changed";
export async function attachRealtime(server: Server) {
  server.adapter(createAdapter(redis, adapterSub));
  await changesSub.subscribe(channel, (id) => {
    server.local.to(id).emit("changed");
  });
}
export async function flushOutbox() {
  if (!redis.isReady) return;
  await transaction(async (c) => {
    const { rows } = await c.query(
      "SELECT id,room_id FROM outbox WHERE delivered_at IS NULL ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 100",
    );
    if (!rows.length) return;
    for (const id of new Set(rows.map((r) => r.room_id)))
      await redis.publish(channel, id);
    // Publish before marking: a crash may repeat invalidations, but cannot erase an unpublished row.
    await c.query(
      "UPDATE outbox SET delivered_at=clock_timestamp() WHERE id=ANY($1::bigint[])",
      [rows.map((r) => r.id)],
    );
  });
}
export async function health() {
  await pool.query("SELECT 1");
  await redis.ping();
  return { ok: true };
}
