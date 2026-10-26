import { Pool, PoolClient } from 'pg';
import { outboxSchema } from './outbox-schema';
import { contentSchema } from './content-schema';
export const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://quiz@127.0.0.1:55432/quiz', max: 20 });
export async function transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T> {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await fn(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function initialize() {
 await transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(912837401)');
  await c.query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id uuid PRIMARY KEY, pin text UNIQUE NOT NULL, host_hash text NOT NULL,
      quiz jsonb NOT NULL, phase text NOT NULL DEFAULT 'lobby', question_index int NOT NULL DEFAULT -1,
      version int NOT NULL DEFAULT 1, started_at timestamptz, deadline timestamptz,
      locked boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS players (
      id uuid PRIMARY KEY, room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      name text NOT NULL, token_hash text NOT NULL, removed boolean NOT NULL DEFAULT false,
      UNIQUE(room_id, token_hash)
    );
    CREATE UNIQUE INDEX IF NOT EXISTS players_unique_name ON players(room_id,lower(name));
    CREATE TABLE IF NOT EXISTS answers (
      room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      question_index int NOT NULL, choice int NOT NULL, points int NOT NULL,
      received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
      PRIMARY KEY (player_id, question_index)
    );
    CREATE INDEX IF NOT EXISTS answers_room ON answers(room_id,question_index);
  `);
  await c.query(contentSchema);
  await c.query(outboxSchema);
 });
}
