import { db } from '@/lib/db';
import { shorts } from '@/lib/db/schema';
import { getTTSService, getVideoService } from '@/lib/providers';
import { buildSubtitleEntries, generateAssSubtitle } from '@/lib/video/subtitle';
import { concatVideos, composeFinal, getMediaDuration } from '@/lib/video/ffmpeg';
import { OUTPUT_DIR, TIMING } from '@/config/constants';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import type { ScriptResult } from '@/types';

export async function updateStatus(
  id: string,
  status: string,
  extra: Record<string, unknown> = {}
) {
  await db
    .update(shorts)
    .set({ status, updatedAt: new Date(), ...extra })
    .where(eq(shorts.id, id));
}

export async function createGenerationJob(id: string, topic: string) {
  await db.insert(shorts).values({
    id,
    topic,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function runVideoPipelineFromScript(
  jobId: string,
  script: ScriptResult
) {
  await updateStatus(jobId, 'tts', {
    script: JSON.stringify(script),
  });

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

  const bgVideoPath = path.join(videoDir, 'background.mp4');
  await concatVideos(downloadedClips, bgVideoPath, totalDuration);

  const subtitleEntries = buildSubtitleEntries(script);
  const subtitlePath = path.join(videoDir, 'subtitle.ass');
  generateAssSubtitle(subtitleEntries, subtitlePath);

  const finalDir = path.join(OUTPUT_DIR, 'final');
  if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
  const finalPath = path.join(finalDir, `${jobId}.mp4`);
  await composeFinal(bgVideoPath, audioPath, subtitlePath, finalPath);

  await updateStatus(jobId, 'done', { finalPath, videoPath: bgVideoPath });

  return {
    audioPath,
    videoPath: bgVideoPath,
    finalPath,
  };
}
