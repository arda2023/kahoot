import { beforeAll, afterAll, it, expect } from "vitest";
import type { ChildProcess } from "node:child_process";
import type { Socket } from "socket.io-client";
import type { Credentials } from "@quiz/contracts";
import { Pool } from "pg";
import {
  startApi,
  stopApi,
  socketAt,
  cmd,
  sync,
  step,
  delay,
} from "../helpers";
let a: ChildProcess, b: ChildProcess;
const sockets: Socket[] = [];
const db = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://quiz@127.0.0.1:55432/quiz",
});
beforeAll(async () => {
  a = await startApi(3104, 10);
  b = await startApi(3105, 10);
});
afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  await Promise.all([stopApi(a), stopApi(b)]);
  await db.end();
});
async function connect(port: number) {
  const s = await socketAt(port);
  sockets.push(s);
  return s;
}
async function crash(process: ChildProcess) {
  const exited = new Promise<void>((r) => process.once("exit", () => r()));
  process.kill("SIGKILL");
  await exited;
}
it("two APIs propagate events and recover committed answers after hard restart", async () => {
  const host = await connect(3104);
  const h = await cmd<Credentials>(host, { action: "create" });
  const one = await connect(3104),
    two = await connect(3105);
  const p = await cmd<Credentials>(one, {
    action: "join",
    pin: h.pin,
    name: "One",
  });
  const p2 = await cmd<Credentials>(two, {
    action: "join",
    pin: h.pin,
    name: "Two",
  });
  await sync(two, p2);
  let changed = 0;
  two.on("changed", () => changed++);
  await delay(300);
  changed = 0;
  await step(host, h);
  await delay(300);
  expect(changed).toBeGreaterThan(0);
  expect((await sync(two, p2)).phase).toBe("question");
  const input = { action: "answer", ...p, questionIndex: 0, choice: 2 };
  await cmd(one, input);
  const stored = (
    await db.query("SELECT * FROM answers WHERE room_id=$1", [h.roomId])
  ).rows;
  expect(stored).toHaveLength(1);
  const score = stored[0].points;
  // Hard kill the instance which acknowledged the answer. The other instance remains usable.
  one.disconnect();
  host.disconnect();
  await crash(a);
  const hostOnB = await connect(3105);
  expect((await sync(hostOnB, h)).phase).toBe("question");
  // Kill all API processes, then restart: reconstruct everything from PostgreSQL.
  two.disconnect();
  hostOnB.disconnect();
  await crash(b);
  const events = (
    await db.query("SELECT count(*)::int n FROM outbox WHERE room_id=$1", [
      h.roomId,
    ])
  ).rows[0].n;
  expect(events).toBeGreaterThanOrEqual(5);
  await db.query("UPDATE outbox SET delivered_at=NULL WHERE room_id=$1", [
    h.roomId,
  ]);
  a = await startApi(3104, 10);
  const resumed = await connect(3104);
  expect((await sync(resumed, p)).myAnswer).toBe(2);
  expect((await cmd(resumed, input)).duplicate).toBe(true);
  const second = await connect(3104);
  await cmd(second, { action: "answer", ...p2, questionIndex: 0, choice: 2 });
  const hostBack = await connect(3104);
  expect((await sync(hostBack, h)).phase).toBe("reveal");
  expect(
    (
      await db.query("SELECT points FROM answers WHERE player_id=$1", [
        stored[0].player_id,
      ])
    ).rows,
  ).toEqual([{ points: score }]);
  expect(
    (
      await db.query("SELECT count(*)::int n FROM answers WHERE room_id=$1", [
        h.roomId,
      ])
    ).rows[0].n,
  ).toBe(2);
  await delay(500);
  expect(
    (
      await db.query(
        "SELECT count(*)::int n FROM outbox WHERE room_id=$1 AND delivered_at IS NULL",
        [h.roomId],
      )
    ).rows[0].n,
  ).toBe(0);
});
it("host disconnect does not stop the deadline; expired rounds recover and wait for host", async () => {
  const host = await connect(3104);
  const h = await cmd<Credentials>(host, { action: "create" });
  const player = await connect(3104);
  const p = await cmd<Credentials>(player, {
    action: "join",
    pin: h.pin,
    name: "Solo",
  });
  await step(host, h);
  host.disconnect();
  await crash(a);
  // Simulate the persisted deadline passing while no application process is alive.
  await db.query(
    "UPDATE rooms SET deadline=clock_timestamp()-interval '1 second' WHERE id=$1",
    [h.roomId],
  );
  a = await startApi(3104, 10);
  const resumed = await connect(3104);
  const s = await sync(resumed, p);
  expect(s.phase).toBe("reveal");
  expect(s.questionIndex).toBe(0);
  await expect(
    cmd(resumed, { action: "answer", ...p, questionIndex: 0, choice: 2 }),
  ).rejects.toThrow("abgelaufen");
  const hostBack = await connect(3104);
  expect((await step(hostBack, h)).phase).toBe("leaderboard");
});
