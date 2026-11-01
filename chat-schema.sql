CREATE TABLE IF NOT EXISTS chat_people(uid TEXT PRIMARY KEY,name TEXT NOT NULL,role TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS chat_members(team_id TEXT NOT NULL,uid TEXT NOT NULL,PRIMARY KEY(team_id,uid));
CREATE INDEX IF NOT EXISTS chat_members_user ON chat_members(uid);
CREATE TABLE IF NOT EXISTS chat_messages(room TEXT NOT NULL,id TEXT NOT NULL,sender_id TEXT NOT NULL,sender_name TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(room,id));
CREATE INDEX IF NOT EXISTS chat_messages_history ON chat_messages(room,created_at);
CREATE INDEX IF NOT EXISTS chat_messages_rate ON chat_messages(sender_id,created_at);
CREATE TABLE IF NOT EXISTS chat_tickets(id TEXT PRIMARY KEY,room TEXT NOT NULL,context TEXT NOT NULL,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS chat_migrations(room TEXT PRIMARY KEY,finished_at INTEGER NOT NULL);
