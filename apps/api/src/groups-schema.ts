export const groupsSchema = `
CREATE TABLE IF NOT EXISTS groups(id uuid PRIMARY KEY,name text NOT NULL,owner_id uuid NOT NULL REFERENCES users(id));
CREATE TABLE IF NOT EXISTS memberships(group_id uuid NOT NULL REFERENCES groups(id),user_id uuid NOT NULL REFERENCES users(id),role text NOT NULL CHECK(role IN ('owner','editor','viewer')),PRIMARY KEY(group_id,user_id));
CREATE TABLE IF NOT EXISTS quiz_shares(quiz_id uuid NOT NULL REFERENCES quizzes(id),group_id uuid NOT NULL REFERENCES groups(id),PRIMARY KEY(quiz_id,group_id));
`;
