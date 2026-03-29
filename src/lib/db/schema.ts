import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const shorts = sqliteTable('shorts', {
  id: text('id').primaryKey(),
  topic: text('topic').notNull(),
  status: text('status').notNull().default('pending'),
  script: text('script', { mode: 'json' }),
  audioPath: text('audio_path'),
  videoPath: text('video_path'),
  finalPath: text('final_path'),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
