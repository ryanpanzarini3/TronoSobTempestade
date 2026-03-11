const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const defaultDataDir = path.join(__dirname, '..', 'data');
const configuredDbPath = process.env.DB_PATH;
const dbPath = configuredDbPath
    ? path.resolve(configuredDbPath)
    : path.join(defaultDataDir, 'app.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('player', 'master')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    master_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(master_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS campaign_members (
    campaign_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY(campaign_id, user_id),
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sheets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    player_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id),
    FOREIGN KEY(player_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_master ON campaigns(master_id);
CREATE INDEX IF NOT EXISTS idx_member_user ON campaign_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sheets_campaign ON sheets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sheets_player ON sheets(player_id);
`);

module.exports = db;
