import { redis } from "./realtime";
import { hash } from "./game";
export async function limit(
  scope: string,
  key: string,
  max: number,
  windowMs = 60000,
) {
  const count = await redis.eval(
    "local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]);end;return n",
    {
      keys: [`quizwerk:rate:${scope}:${hash(key)}`],
      arguments: [String(windowMs)],
    },
  );
  if (Number(count) > max)
    throw new Error("Zu viele Anfragen. Bitte kurz warten.");
}
