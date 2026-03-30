import { db } from '@/lib/db';
import { shorts } from '@/lib/db/schema';
import { getTTSService, getVideoService } from '@/lib/providers';
import {
  buildSubtitleEntries,
  buildSubtitleEntriesFromSegments,
  generateAssSubtitle,
} from '@/lib/video/subtitle';
import {
  concatAudio,
  composeFinal,
  composeSlides,
  getMediaDuration,
  type SlideSegment,
} from '@/lib/video/ffmpeg';
import { OUTPUT_DIR } from '@/config/constants';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import type { ManualVideoSelection, ScriptResult } from '@/types';

function buildLogLine(message: string): string {
  const now = new Date().toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `[${now}] ${message}`;
}

export async function appendProgressLog(id: string, message: string) {
  const records = await db.select().from(shorts).where(eq(shorts.id, id));
  if (records.length === 0) return;

  const current = records[0].progressLog;
  let log: string[] = [];

  if (Array.isArray(current)) {
    log = current as string[];
  } else if (typeof current === 'string' && current.trim()) {
    try {
      log = JSON.parse(current) as string[];
    } catch {
      log = [];
    }
  }

  log.push(buildLogLine(message));

  await db
    .update(shorts)
    .set({ progressLog: JSON.stringify(log), updatedAt: new Date() })
    .where(eq(shorts.id, id));
}

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

export async function createGenerationJob(
  id: string,
  topic: string,
  inputMode: 'topic' | 'script' = 'topic'
) {
  await db.insert(shorts).values({
    id,
    topic,
    status: 'pending',
    progressStep: 'queued',
    progressMessage: '작업 대기 중',
    progressLog: JSON.stringify([buildLogLine('작업이 생성되었습니다')]),
    progressCurrent: 0,
    progressTotal: 4,
    inputMode,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

export async function runVideoPipelineFromScript(
  jobId: string,
  script: ScriptResult,
  videoSelections: ManualVideoSelection[] = []
) {
  type NarrativeSegment = {
    key: string;
    text: string;
    subtitleText: string;
    subtitleStyle: 'Hero' | 'Default' | 'Rank';
    slide: SlideSegment;
  };

  const narrativeSegments: NarrativeSegment[] = [
    {
      key: 'hook',
      text: script.hook,
      subtitleText: script.hook,
      subtitleStyle: 'Hero',
      slide: {
        type: 'title',
        duration: 1,
        title: '잠깐',
        subtitle: script.hook,
      },
    },
    {
      key: 'intro',
      text: script.intro,
      subtitleText: script.intro,
      subtitleStyle: 'Default',
      slide: {
        type: 'title',
        duration: 1,
        title: script.metadata.title,
        subtitle: script.intro,
      },
    },
  ];

  script.items.forEach((item, index) => {
    narrativeSegments.push({
      key: `item-${index}`,
      text: `${item.rank}위, ${item.title}. ${item.description}`,
      subtitleText: `{\\fs92\\b1}${item.rank}위\\N{\\fs66}${item.title}`,
      subtitleStyle: 'Rank',
      slide: {
        type: 'image',
        duration: 1,
      },
    });
  });

  narrativeSegments.push({
    key: 'cta',
    text: script.cta,
    subtitleText: script.cta,
    subtitleStyle: 'Hero',
    slide: {
      type: 'title',
      duration: 1,
      title: '다음 영상도 준비했어요',
      subtitle: script.cta,
    },
  });

  await updateStatus(jobId, 'tts', {
    progressStep: 'tts',
    progressMessage: '음성을 생성하는 중',
    progressCurrent: 1,
    progressTotal: 4,
    script: JSON.stringify(script),
  });
  await appendProgressLog(jobId, '음성 생성을 시작했습니다');

  const ttsService = getTTSService();
  const audioDir = path.join(OUTPUT_DIR, 'audio');
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });
  const segmentAudioDir = path.join(audioDir, jobId);
  if (!fs.existsSync(segmentAudioDir)) fs.mkdirSync(segmentAudioDir, { recursive: true });

  const segmentAudioPaths: string[] = [];
  const segmentDurations: number[] = [];

  for (let index = 0; index < narrativeSegments.length; index++) {
    const segment = narrativeSegments[index];
    const ttsResult = await ttsService.synthesize({ text: segment.text, speed: 1.2 });
    const segmentAudioPath = path.join(
      segmentAudioDir,
      `${String(index).padStart(2, '0')}-${segment.key}.mp3`
    );
    fs.writeFileSync(segmentAudioPath, ttsResult.audioBuffer);

    const actualDuration = Math.max(1, await getMediaDuration(segmentAudioPath));
    segmentAudioPaths.push(segmentAudioPath);
    segmentDurations.push(actualDuration);
  }

  const audioPath = path.join(audioDir, `${jobId}.mp3`);
  await concatAudio(segmentAudioPaths, audioPath);

  const finalAudioDuration = await getMediaDuration(audioPath);

  await updateStatus(jobId, 'tts', {
    audioPath,
    progressMessage: `음성 생성 완료 (${Math.round(finalAudioDuration)}초)`,
  });
  await appendProgressLog(jobId, '오디오 파일 생성이 완료되었습니다');

  await updateStatus(jobId, 'background', {
    progressStep: 'background',
    progressMessage: '대표 이미지를 수집하는 중',
    progressCurrent: 2,
    progressTotal: 4,
  });
  await appendProgressLog(jobId, '대표 이미지 수집을 시작했습니다');
  const videoService = getVideoService();
  const videoDir = path.join(OUTPUT_DIR, 'video', jobId);
  if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

  let introImagePath: string | null = null;
  const introQuery =
    script.items[0]?.searchQuery?.trim() || script.metadata.title || script.intro;

  try {
    const introResults = await videoService.search({
      query: introQuery,
      orientation: 'portrait',
      minDuration: Math.max(segmentDurations[0] || 1, segmentDurations[1] || 1),
    });

    if (introResults.length > 0) {
      introImagePath = path.join(videoDir, 'intro.jpg');
      await videoService.download(introResults[0].downloadUrl, introImagePath);
      await appendProgressLog(jobId, '인트로 대표 이미지를 자동 저장했습니다');
    }
  } catch {
    introImagePath = null;
  }

  const slides: SlideSegment[] = [
    introImagePath
      ? {
          type: 'image',
          inputPath: introImagePath,
          duration: segmentDurations[0],
        }
      : {
          ...narrativeSegments[0].slide,
          duration: segmentDurations[0],
        },
    introImagePath
      ? {
          type: 'image',
          inputPath: introImagePath,
          duration: segmentDurations[1],
        }
      : {
          ...narrativeSegments[1].slide,
          duration: segmentDurations[1],
        },
  ];

  for (let i = 0; i < script.items.length; i++) {
    const item = script.items[i];
    const selection = videoSelections.find((entry) => entry.itemIndex === i);
    const query = selection?.searchQuery?.trim() || item.searchQuery;
    const itemDuration = segmentDurations[i + 2] || 1;

    if (selection?.selectedDownloadUrl) {
      const clipPath = path.join(videoDir, `clip_${i}.jpg`);
      await videoService.download(selection.selectedDownloadUrl, clipPath);
      slides.push({
        ...narrativeSegments[i + 2].slide,
        inputPath: clipPath,
        duration: itemDuration,
      });
      await updateStatus(jobId, 'background', {
        progressMessage: `대표 이미지 ${i + 1}/${script.items.length} 준비 완료`,
      });
      await appendProgressLog(jobId, `${i + 1}번째 대표 이미지를 선택본으로 저장했습니다`);
      continue;
    }

    const results = await videoService.search({
      query,
      orientation: 'portrait',
      minDuration: itemDuration,
    });

    if (results.length > 0) {
      const clipPath = path.join(videoDir, `clip_${i}.jpg`);
      await videoService.download(results[0].downloadUrl, clipPath);
      slides.push({
        ...narrativeSegments[i + 2].slide,
        inputPath: clipPath,
        duration: itemDuration,
      });
      await updateStatus(jobId, 'background', {
        progressMessage: `대표 이미지 ${i + 1}/${script.items.length} 준비 완료`,
      });
      await appendProgressLog(jobId, `${i + 1}번째 대표 이미지를 자동 저장했습니다`);
    }
  }

  if (slides.length < 2 + script.items.length) {
    throw new Error('대표 이미지를 충분히 찾을 수 없습니다');
  }

  slides.push({
    ...(introImagePath
      ? {
          type: 'image' as const,
          inputPath: introImagePath,
        }
      : narrativeSegments[narrativeSegments.length - 1].slide),
    duration: segmentDurations[segmentDurations.length - 1],
  });

  await updateStatus(jobId, 'composing', {
    progressStep: 'compose',
    progressMessage: '장면을 컷 편집하는 중',
    progressCurrent: 3,
    progressTotal: 4,
  });
  await appendProgressLog(jobId, '사진 슬라이드 컷 편집을 시작했습니다');

  const bgVideoPath = path.join(videoDir, 'background.mp4');
  await composeSlides(slides, bgVideoPath);

  const subtitleEntries = buildSubtitleEntriesFromSegments(
    narrativeSegments.map((segment, index) => ({
      duration: segmentDurations[index] || 1,
      text: segment.subtitleText,
      style: segment.subtitleStyle,
    }))
  );
  const subtitlePath = path.join(videoDir, 'subtitle.ass');
  generateAssSubtitle(subtitleEntries, subtitlePath);
  await updateStatus(jobId, 'composing', { videoPath: bgVideoPath });
  await appendProgressLog(jobId, '자막 파일 생성이 완료되었습니다');

  await updateStatus(jobId, 'composing', {
    progressMessage: '최종 영상을 합성하는 중',
  });
  await appendProgressLog(jobId, '최종 영상 합성을 시작했습니다');

  const finalDir = path.join(OUTPUT_DIR, 'final');
  if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
  const finalPath = path.join(finalDir, `${jobId}.mp4`);
  await composeFinal(bgVideoPath, audioPath, subtitlePath, finalPath);

  await updateStatus(jobId, 'done', {
    finalPath,
    videoPath: bgVideoPath,
    progressStep: 'done',
    progressMessage: '생성이 완료되었습니다',
    progressCurrent: 4,
    progressTotal: 4,
  });
  await appendProgressLog(jobId, '최종 영상 생성이 완료되었습니다');

  return {
    audioPath,
    videoPath: bgVideoPath,
    finalPath,
  };
}

export async function resumeGenerationJob(jobId: string) {
  const records = await db.select().from(shorts).where(eq(shorts.id, jobId));
  if (records.length === 0) {
    throw new Error('작업을 찾을 수 없습니다');
  }

  const record = records[0];
  const scriptValue = record.script;
  const script =
    typeof scriptValue === 'string'
      ? (JSON.parse(scriptValue) as ScriptResult)
      : (scriptValue as ScriptResult | null);

  if (!script) {
    throw new Error('스크립트가 없어 이어서 진행할 수 없습니다');
  }

  const audioPath = record.audioPath;
  const videoPath = record.videoPath;
  const videoDir = path.join(OUTPUT_DIR, 'video', jobId);
  const subtitlePath = path.join(videoDir, 'subtitle.ass');
  const finalDir = path.join(OUTPUT_DIR, 'final');
  const finalPath = path.join(finalDir, `${jobId}.mp4`);

  if (videoPath && audioPath && fs.existsSync(videoPath) && fs.existsSync(audioPath)) {
    await updateStatus(jobId, 'composing', {
      progressStep: 'compose',
      progressMessage: '저장된 산출물로 최종 합성을 다시 시도하는 중',
      progressCurrent: 3,
      progressTotal: 4,
      error: null,
    });
    await appendProgressLog(jobId, '기존 오디오와 배경 영상으로 최종 합성을 다시 시도합니다');

    if (!fs.existsSync(subtitlePath)) {
      const subtitleEntries = buildSubtitleEntries(script);
      generateAssSubtitle(subtitleEntries, subtitlePath);
    }
    if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
    await composeFinal(videoPath, audioPath, subtitlePath, finalPath);

    await updateStatus(jobId, 'done', {
      finalPath,
      progressStep: 'done',
      progressMessage: '이어 시도 후 생성이 완료되었습니다',
      progressCurrent: 4,
      progressTotal: 4,
      error: null,
    });
    await appendProgressLog(jobId, '이어 시도를 통해 최종 영상 생성이 완료되었습니다');
    return;
  }

  await updateStatus(jobId, 'pending', {
    progressStep: 'queued',
    progressMessage: '스크립트부터 다시 이어서 생성하는 중',
    progressCurrent: 0,
    progressTotal: 4,
    error: null,
  });
  await appendProgressLog(jobId, '중간 산출물이 부족해 스크립트 기준으로 다시 생성합니다');
  await runVideoPipelineFromScript(jobId, script);
}
