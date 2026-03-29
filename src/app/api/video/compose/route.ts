import { NextResponse } from 'next/server';
import { concatVideos, composeFinal } from '@/lib/video/ffmpeg';
import { buildSubtitleEntries, generateAssSubtitle } from '@/lib/video/subtitle';
import { OUTPUT_DIR } from '@/config/constants';
import path from 'path';
import fs from 'fs';
import type { ScriptResult } from '@/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      jobId: string;
      script: ScriptResult;
      audioPath: string;
      clipPaths: string[];
      totalDuration: number;
    };

    if (!body.jobId || !body.script || !body.audioPath || !body.clipPaths?.length) {
      return NextResponse.json(
        { error: 'jobId, script, audioPath, and clipPaths are required' },
        { status: 400 }
      );
    }

    const videoDir = path.join(OUTPUT_DIR, 'video', body.jobId);
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    // Concat clips
    const bgVideoPath = path.join(videoDir, 'background.mp4');
    await concatVideos(body.clipPaths, bgVideoPath, body.totalDuration);

    // Generate subtitle
    const subtitleEntries = buildSubtitleEntries(body.script);
    const subtitlePath = path.join(videoDir, 'subtitle.ass');
    generateAssSubtitle(subtitleEntries, subtitlePath);

    // Final compose
    const finalDir = path.join(OUTPUT_DIR, 'final');
    if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
    const finalPath = path.join(finalDir, `${body.jobId}.mp4`);
    await composeFinal(bgVideoPath, body.audioPath, subtitlePath, finalPath);

    return NextResponse.json({ finalPath });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Video compose failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
