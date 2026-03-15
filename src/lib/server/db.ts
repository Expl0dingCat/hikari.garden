import Database from 'better-sqlite3';
import { resolve } from 'path';

const DB_PATH = resolve('data/entries.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
	CREATE TABLE IF NOT EXISTS entries (
		id TEXT PRIMARY KEY,
		date TEXT NOT NULL,
		created_at INTEGER NOT NULL,
		updated_at INTEGER NOT NULL,
		text TEXT NOT NULL,
		mood_joy REAL NOT NULL,
		mood_energy REAL NOT NULL,
		mood_tenderness REAL NOT NULL,
		mood_clarity REAL NOT NULL,
		mood_hope REAL NOT NULL,
		flower_seed INTEGER NOT NULL,
		flower_name TEXT NOT NULL,
		tags TEXT
	);

	CREATE TABLE IF NOT EXISTS sessions (
		token TEXT PRIMARY KEY,
		created_at INTEGER NOT NULL,
		expires_at INTEGER NOT NULL
	);
`);

export default db;
