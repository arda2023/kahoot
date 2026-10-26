export const contentSchema=`
CREATE TABLE IF NOT EXISTS users (id uuid PRIMARY KEY,email text UNIQUE NOT NULL,password_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS user_sessions (token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id),expires_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS quizzes (id uuid PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id),draft jsonb NOT NULL,revision int NOT NULL DEFAULT 1,archived boolean NOT NULL DEFAULT false,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS quiz_versions (id uuid PRIMARY KEY,quiz_id uuid NOT NULL REFERENCES quizzes(id),number int NOT NULL,body jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(quiz_id,number));
CREATE TABLE IF NOT EXISTS media (id text PRIMARY KEY,owner_id uuid NOT NULL REFERENCES users(id));
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES users(id);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS quiz_version_id uuid REFERENCES quiz_versions(id);
`;
