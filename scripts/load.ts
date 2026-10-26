import { performance } from "node:perf_hooks";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, platform, arch } from "node:os";
import { Pool } from "pg";
import type { Credentials, Snapshot } from "@quiz/contracts";
import type { Socket } from "socket.io-client";
import { seedQuiz } from "@quiz/game-engine";
import {
  startApi,
  stopApi,
  socketAt,
  cmd,
  sync,
  step,
  delay,
} from "../tests/helpers";
const db = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://quiz@127.0.0.1:55432/quiz",
});
const samples: Record<string, number[]> = {
  join: [],
  answer: [],
  snapshot: [],
};
let errors = 0;
async function timed<T>(kind: string, fn: () => Promise<T>) {
  const start = performance.now();
  try {
    return await fn();
  } catch (e) {
    errors++;
    throw e;
  } finally {
    samples[kind].push(performance.now() - start);
  }
}
function stats(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  return {
    count: s.length,
    p50: Math.round(s[Math.floor(s.length * 0.5)] ?? 0),
    p95: Math.round(
      s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] ?? 0,
    ),
    max: Math.round(s.at(-1) ?? 0),
  };
}
async function scenario(roomCount: number, playerCount: number) {
  const all: Socket[] = [];
  const start = performance.now(),
    beforeErrors = errors;
  for (const key of Object.keys(samples)) samples[key] = [];
  try {
    const rooms = await Promise.all(
      Array.from({ length: roomCount }, async (_, r) => {
        const host = await socketAt(3301 + (r % 2));
        all.push(host);
        const h = await cmd<Credentials>(host, { action: "create" });
        const players = await Promise.all(
          Array.from({ length: playerCount }, async (_, i) => {
            const s = await socketAt(3301 + (i % 2));
            all.push(s);
            const c = await timed("join", () =>
              cmd<Credentials>(s, {
                action: "join",
                pin: h.pin,
                name: `Spieler ${i}`,
              }),
            );
            let busy = false,
              again = false;
            const refresh = async () => {
              if (busy) {
                again = true;
                return;
              }
              busy = true;
              do {
                again = false;
                try {
                  await timed("snapshot", () => sync(s, c));
                } catch {
                  /* Error counter is checked at end. */
                }
              } while (again && s.connected);
              busy = false;
            };
            await refresh();
            s.on("changed", () => void refresh());
            return { s, c };
          }),
        );
        return { host, h, players };
      }),
    );
    await Promise.all(
      rooms.map(async ({ host, h, players }) => {
        for (let q = 0; q < seedQuiz.questions.length; q++) {
          await step(host, h);
          await Promise.all(
            players.map(async ({ s, c }, i) => {
              const input = {
                action: "answer",
                ...c,
                questionIndex: q,
                choice: seedQuiz.questions[q].correctIndex,
              };
              await timed("answer", () => cmd(s, input));
              if (i % 10 === 0) await timed("answer", () => cmd(s, input));
            }),
          );
          let state: Snapshot = await sync(host, h);
          for (let i = 0; i < 50 && state.phase !== "reveal"; i++) {
            await delay(100);
            state = await sync(host, h);
          }
          if (state.phase !== "reveal")
            throw new Error("Question did not close");
          await step(host, h);
        }
        const end = await step(host, h);
        if (end.phase !== "finished") throw new Error("Missing final state");
        const count = Number(
          (
            await db.query("SELECT count(*) n FROM answers WHERE room_id=$1", [
              h.roomId,
            ])
          ).rows[0].n,
        );
        if (count !== playerCount * 3)
          throw new Error(`Expected ${playerCount * 3} answers, got ${count}`);
        const persisted = (
          await db.query(
            "SELECT player_id,sum(points)::int score FROM answers WHERE room_id=$1 GROUP BY player_id",
            [h.roomId],
          )
        ).rows;
        for (const p of end.players)
          if (p.score !== persisted.find((x) => x.player_id === p.id)?.score)
            throw new Error("Score mismatch");
      }),
    );
    await delay(500);
    const result = {
      rooms: roomCount,
      playersPerRoom: playerCount,
      totalPlayers: roomCount * playerCount,
      answers: roomCount * playerCount * 3,
      seconds: Number(((performance.now() - start) / 1000).toFixed(2)),
      errors: errors - beforeErrors,
      metrics: Object.fromEntries(
        Object.entries(samples).map(([k, v]) => [k, stats(v)]),
      ),
    };
    if (result.errors) throw new Error(`${result.errors} command errors`);
    return result;
  } finally {
    all.forEach((s) => s.disconnect());
  }
}
async function main() {
  await mkdir(".local", { recursive: true });
  const a = await startApi(3301, 20),
    b = await startApi(3302, 20);
  try {
    const results = [];
    for (const [r, p] of [
      [1, 100],
      [5, 100],
    ]) {
      const result = await scenario(r, p);
      results.push(result);
      console.log(JSON.stringify(result));
    }
    const report = {
      at: new Date().toISOString(),
      environment: {
        node: process.version,
        platform: platform(),
        arch: arch(),
        cpu: cpus()[0]?.model,
        logicalCpus: cpus().length,
      },
      results,
    };
    await writeFile(
      ".local/load-results.json",
      JSON.stringify(report, null, 2),
    );
  } finally {
    await Promise.all([stopApi(a), stopApi(b)]);
    await db.end();
  }
}
void main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
