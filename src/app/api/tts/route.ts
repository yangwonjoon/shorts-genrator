import { NextResponse } from 'next/server';
import { getTTSService } from '@/lib/providers';
import type { ScriptResult } from '@/types';
import { TIMING } from '@/config/constants';
import { OUTPUT_DIR } from '@/config/constants';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      script: ScriptResult;
      jobId: string;
    };

    if (!body.script || !body.jobId) {
      return NextResponse.json(
        { error: 'script and jobId are required' },
        { status: 400 }
      );
    }

    const ttsService = getTTSService();
    const { script, jobId } = body;

    // Build full TTS text in order: hook → intro → items → cta
    const segments: string[] = [
      script.hook,
      script.intro,
      ...script.items.map(
        (item) => `${item.rank}위, ${item.title}. ${item.description}`
      ),
      script.cta,
    ];

    const fullText = segments.join(' ... ');

    const result = await ttsService.synthesize({ text: fullText });

    // Save audio file
    const audioDir = path.join(OUTPUT_DIR, 'audio');
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

    const audioPath = path.join(audioDir, `${jobId}.mp3`);
    fs.writeFileSync(audioPath, result.audioBuffer);

    // Calculate total expected duration
    const totalDuration =
      TIMING.HOOK_DURATION +
      TIMING.INTRO_DURATION +
      script.items.reduce((sum, item) => sum + (item.duration || TIMING.ITEM_DURATION), 0) +
      TIMING.CTA_DURATION;

    return NextResponse.json({
      audioPath,
      duration: result.duration,
      expectedDuration: totalDuration,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'TTS generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
