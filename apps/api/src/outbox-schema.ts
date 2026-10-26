export const outboxSchema = `
CREATE TABLE IF NOT EXISTS outbox(id bigserial PRIMARY KEY,room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,version int NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),delivered_at timestamptz,UNIQUE(room_id,version));
CREATE INDEX IF NOT EXISTS pending_outbox ON outbox(id) WHERE delivered_at IS NULL;
CREATE OR REPLACE FUNCTION room_event() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO outbox(room_id,version) VALUES(NEW.id,NEW.version) ON CONFLICT DO NOTHING;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS room_event_trigger ON rooms;
CREATE TRIGGER room_event_trigger AFTER INSERT OR UPDATE ON rooms FOR EACH ROW EXECUTE FUNCTION room_event();
`;
