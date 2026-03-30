import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { shorts } from '@/lib/db/schema';
import { getAIService } from '@/lib/providers';
import { createGenerationJob, runVideoPipelineFromScript, updateStatus } from '@/lib/generation/pipeline';
import { normalizeGenerationRecord } from '@/lib/generation/record';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import type { GenerateRequest, ScriptResult } from '@/types';

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

    await createGenerationJob(jobId, body.topic, 'topic');

    void (async () => {
      try {
        await updateStatus(jobId, 'scripting', {
          progressStep: 'script',
          progressMessage: '스크립트를 생성하는 중',
          progressCurrent: 0,
          progressTotal: 4,
        });

        const aiService = getAIService();
        const script: ScriptResult = await aiService.generateScript({
          topic: body.topic,
          language: body.language || 'ko',
          itemCount: body.itemCount || 10,
        });

        await runVideoPipelineFromScript(jobId, script);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Generation failed';
        await updateStatus(jobId, 'failed', {
          error: message,
          progressStep: 'failed',
          progressMessage: message,
        }).catch(() => {});
      }
    })();

    return NextResponse.json({
      id: jobId,
      status: 'pending',
      progressStep: 'queued',
      progressMessage: '생성 작업이 시작되었습니다',
      progressCurrent: 0,
      progressTotal: 4,
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
    const records = await db.select().from(shorts).orderBy(shorts.createdAt);
    return NextResponse.json(records.map(normalizeGenerationRecord));
  }

  const record = await db.select().from(shorts).where(eq(shorts.id, id));
  if (record.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(normalizeGenerationRecord(record[0]));
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const record = await db.select().from(shorts).where(eq(shorts.id, id));
  if (record.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const entry = normalizeGenerationRecord(record[0]);

  const pathsToDelete = [entry.audioPath, entry.videoPath, entry.finalPath].filter(
    Boolean
  ) as string[];

  for (const targetPath of pathsToDelete) {
    try {
      if (fs.existsSync(targetPath)) {
        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
          fs.rmSync(targetPath, { recursive: true, force: true });
        } else {
          fs.rmSync(targetPath, { force: true });
        }
      }
    } catch {}
  }

  const videoDir = path.join(process.cwd(), 'output', 'video', id);
  if (fs.existsSync(videoDir)) {
    try {
      fs.rmSync(videoDir, { recursive: true, force: true });
    } catch {}
  }

  await db.delete(shorts).where(eq(shorts.id, id));

  return NextResponse.json({ ok: true });
}
