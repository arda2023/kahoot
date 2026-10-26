import { spawn, type ChildProcess } from "node:child_process";
import { io, type Socket } from "socket.io-client";
import type { Reply, Credentials, Snapshot } from "@quiz/contracts";
export const delay = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
export async function startApi(
  port: number,
  seconds = 2,
): Promise<ChildProcess> {
  const child = spawn(process.execPath, ["apps/api/dist/main.js"], {
    env: {
      ...process.env,
      PORT: String(port),
      SEED_SECONDS: String(seconds),
      WEB_ORIGIN: "http://localhost:3200",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout?.on("data", (d) => {
    output += d;
  });
  child.stderr?.on("data", (d) => {
    output += d;
  });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(output);
    try {
      const r = await fetch(`http://localhost:${port}/health`);
      if (r.ok) return child;
    } catch {
      /* Wait for the child process to bind its port. */
    }
    await delay(100);
  }
  child.kill();
  throw new Error(`API did not start: ${output}`);
}
export async function stopApi(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise<void>((r) => child.once("exit", () => r())),
    delay(4000),
  ]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
export async function socketAt(port: number): Promise<Socket> {
  const s = io(`http://localhost:${port}`, {
    transports: ["websocket"],
    forceNew: true,
  });
  await new Promise<void>((resolve, reject) => {
    s.once("connect", () => resolve());
    s.once("connect_error", reject);
  });
  return s;
}
export function cmd<T = any>(s: Socket, input: any): Promise<T> {
  return new Promise((resolve, reject) =>
    s
      .timeout(10000)
      .emit("command", input, (err: Error | null, r: Reply<T>) =>
        err ? reject(err) : r.ok ? resolve(r.data) : reject(new Error(r.error)),
      ),
  );
}
export const sync = (s: Socket, c: Credentials) =>
  cmd<Snapshot>(s, { action: "sync", ...c });
export async function step(s: Socket, c: Credentials) {
  const state = await sync(s, c);
  await cmd(s, { action: "advance", ...c, version: state.version });
  return sync(s, c);
}
