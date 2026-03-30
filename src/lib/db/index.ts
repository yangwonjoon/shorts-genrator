import 'server-only';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'shorts.db');

const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrency
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

function ensureColumn(name: string, definition: string) {
  const columns = sqlite
    .prepare("PRAGMA table_info('shorts')")
    .all() as Array<{ name: string }>;

  if (!columns.some((column) => column.name === name)) {
    sqlite.exec(`ALTER TABLE shorts ADD COLUMN ${definition}`);
  }
}

// Auto-create tables on first import
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS shorts (
    id TEXT PRIMARY KEY,
    topic TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    progress_step TEXT,
    progress_message TEXT,
    progress_log TEXT,
    progress_current INTEGER,
    progress_total INTEGER,
    input_mode TEXT NOT NULL DEFAULT 'topic',
    script TEXT,
    audio_path TEXT,
    video_path TEXT,
    final_path TEXT,
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`);

ensureColumn('progress_step', 'progress_step TEXT');
ensureColumn('progress_message', 'progress_message TEXT');
ensureColumn('progress_log', 'progress_log TEXT');
ensureColumn('progress_current', 'progress_current INTEGER');
ensureColumn('progress_total', 'progress_total INTEGER');
ensureColumn('input_mode', "input_mode TEXT NOT NULL DEFAULT 'topic'");
