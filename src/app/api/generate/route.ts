import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { shorts } from '@/lib/db/schema';
import { getAIService, getTTSService, getVideoService } from '@/lib/providers';
import { buildSubtitleEntries, generateAssSubtitle } from '@/lib/video/subtitle';
import { concatVideos, composeFinal, getMediaDuration } from '@/lib/video/ffmpeg';
import { OUTPUT_DIR, TIMING } from '@/config/constants';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import type { GenerateRequest, ScriptResult } from '@/types';

async function updateStatus(
  id: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  await db
    .update(shorts)
    .set({ status, updatedAt: new Date(), ...extra })
    .where(eq(shorts.id, id));
}

export async function POST(request: Request) {
  const jobId = uuidv4();

  try {
    const body = (await request.json()) as GenerateRequest;

    if (!body.topic?.trim()) {
      return NextResponse.json(
        { error: '주제를 입력해주세요' },
        { status: 400 }
      );
    }

    // Create DB record
    await db.insert(shorts).values({
      id: jobId,
      topic: body.topic,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // --- Step 1: Script Generation ---
    await updateStatus(jobId, 'scripting');
    const aiService = getAIService();
    const script: ScriptResult = await aiService.generateScript({
      topic: body.topic,
      language: body.language || 'ko',
      itemCount: body.itemCount || 10,
    });
    await updateStatus(jobId, 'scripting', {
      script: JSON.stringify(script),
    });

    // --- Step 2: TTS ---
    await updateStatus(jobId, 'tts');
    const ttsService = getTTSService();

    const segments: string[] = [
      script.hook,
      script.intro,
      ...script.items.map(
        (item) => `${item.rank}위, ${item.title}. ${item.description}`
      ),
      script.cta,
    ];
    const fullText = segments.join(' ... ');

    const ttsResult = await ttsService.synthesize({ text: fullText });

    const audioDir = path.join(OUTPUT_DIR, 'audio');
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
    const audioPath = path.join(audioDir, `${jobId}.mp3`);
    fs.writeFileSync(audioPath, ttsResult.audioBuffer);

    await updateStatus(jobId, 'tts', { audioPath });

    // --- Step 3: Background Videos ---
    await updateStatus(jobId, 'composing');
    const videoService = getVideoService();

    const videoDir = path.join(OUTPUT_DIR, 'video', jobId);
    if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

    const downloadedClips: string[] = [];
    for (let i = 0; i < script.items.length; i++) {
      const item = script.items[i];
      const results = await videoService.search({
        query: item.searchQuery,
        orientation: 'portrait',
        minDuration: item.duration || TIMING.ITEM_DURATION,
      });

      if (results.length > 0) {
        const clipPath = path.join(videoDir, `clip_${i}.mp4`);
        await videoService.download(results[0].downloadUrl, clipPath);
        downloadedClips.push(clipPath);
      }
    }

    if (downloadedClips.length === 0) {
      throw new Error('배경 영상을 찾을 수 없습니다');
    }

    // --- Step 4: Compose Final Video ---
    const audioDuration = await getMediaDuration(audioPath);
    const totalDuration =
      audioDuration ||
      TIMING.HOOK_DURATION +
        TIMING.INTRO_DURATION +
        script.items.reduce(
          (sum, item) => sum + (item.duration || TIMING.ITEM_DURATION),
          0
        ) +
        TIMING.CTA_DURATION;

    // Concat background clips
    const bgVideoPath = path.join(videoDir, 'background.mp4');
    await concatVideos(downloadedClips, bgVideoPath, totalDuration);

    // Generate subtitle
    const subtitleEntries = buildSubtitleEntries(script);
    const subtitlePath = path.join(videoDir, 'subtitle.ass');
    generateAssSubtitle(subtitleEntries, subtitlePath);

    // Final compose
    const finalDir = path.join(OUTPUT_DIR, 'final');
    if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
    const finalPath = path.join(finalDir, `${jobId}.mp4`);
    await composeFinal(bgVideoPath, audioPath, subtitlePath, finalPath);

    await updateStatus(jobId, 'done', { finalPath, videoPath: bgVideoPath });

    return NextResponse.json({
      id: jobId,
      status: 'done',
      script,
      videoUrl: `/api/video/serve?id=${jobId}`,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Generation failed';
    await updateStatus(jobId, 'failed', { error: message }).catch(() => {});
    return NextResponse.json(
      { id: jobId, status: 'failed', error: message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    // Return all records
    const records = await db.select().from(shorts).orderBy(shorts.createdAt);
    return NextResponse.json(records);
  }

  const record = await db.select().from(shorts).where(eq(shorts.id, id));
  if (record.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(record[0]);
}
