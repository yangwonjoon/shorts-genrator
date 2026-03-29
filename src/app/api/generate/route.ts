import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { db } from '@/lib/db';
import { shorts } from '@/lib/db/schema';
import { getAIService } from '@/lib/providers';
import { createGenerationJob, runVideoPipelineFromScript, updateStatus } from '@/lib/generation/pipeline';
import { eq } from 'drizzle-orm';
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

    await createGenerationJob(jobId, body.topic);

    await updateStatus(jobId, 'scripting');
    const aiService = getAIService();
    const script: ScriptResult = await aiService.generateScript({
      topic: body.topic,
      language: body.language || 'ko',
      itemCount: body.itemCount || 10,
    });
    await runVideoPipelineFromScript(jobId, script);

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
