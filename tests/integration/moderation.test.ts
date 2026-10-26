import { beforeAll, afterAll, it, expect } from "vitest";
import type { ChildProcess } from "node:child_process";
import type { Credentials } from "@quiz/contracts";
import type { Socket } from "socket.io-client";
import { startApi, stopApi, socketAt, cmd, sync, step } from "../helpers";
let api: ChildProcess;
const sockets: Socket[] = [];
beforeAll(async () => {
  api = await startApi(3107);
});
afterAll(async () => {
  sockets.forEach((s) => s.disconnect());
  await stopApi(api);
});
it("host locks joins and removes players; removed tokens lose authority", async () => {
  const h = await socketAt(3107),
    p = await socketAt(3107);
  sockets.push(h, p);
  const hc = await cmd<Credentials>(h, { action: "create" });
  const pc = await cmd<Credentials>(p, {
    action: "join",
    pin: hc.pin,
    name: "Guest",
  });
  const state = await sync(h, hc);
  await expect(cmd(p, { action: "lock", ...pc, locked: true })).rejects.toThrow(
    "Host",
  );
  await cmd(h, { action: "lock", ...hc, locked: true });
  await expect(
    cmd(p, { action: "join", pin: hc.pin, name: "Second" }),
  ).rejects.toThrow("geschlossen");
  await cmd(h, { action: "remove", ...hc, playerId: state.players[0].id });
  await expect(sync(p, pc)).rejects.toThrow("entfernt");
  expect((await sync(h, hc)).players).toHaveLength(0);
  await cmd(h, { action: "lock", ...hc, locked: false });
  const second = await cmd<Credentials>(p, {
    action: "join",
    pin: hc.pin,
    name: "Second",
  });
  expect(second.roomId).toBe(hc.roomId);
  for (let i = 0; i < 3; i++) {
    await step(h, hc);
    await cmd(p, { action: "answer", ...second, questionIndex: i, choice: 0 });
    await step(h, hc);
  }
  await step(h, hc);
  const report = await (
    await fetch(`http://localhost:3107/rooms/${hc.roomId}/report`, {
      headers: { Authorization: `Bearer ${hc.token}` },
    })
  ).json();
  expect(report.players.map((x: { name: string }) => x.name)).toEqual([
    "Second",
  ]);
  expect(report.rows).toHaveLength(3);
});
it("bounds command floods without blocking a separate player connection", async () => {
  const s = await socketAt(3107);
  sockets.push(s);
  let limited = 0;
  for (let i = 0; i < 605; i++) {
    try {
      await cmd(s, { action: "unknown" });
    } catch (e) {
      if ((e as Error).message.includes("Zu viele")) limited++;
    }
  }
  expect(limited).toBeGreaterThan(0);
  const other = await socketAt(3107);
  sockets.push(other);
  expect((await cmd<Credentials>(other, { action: "create" })).pin).toMatch(
    /^\d{6}$/,
  );
});
