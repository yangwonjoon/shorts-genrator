import { NextResponse } from 'next/server';
import { appendProgressLog, resumeGenerationJob, runVideoPipelineFromScript, updateStatus } from '@/lib/generation/pipeline';
import { db } from '@/lib/db';
import { shorts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import type { ScriptResult } from '@/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      action?: 'resume' | 'retry';
    };

    if (!body.id || !body.action) {
      return NextResponse.json(
        { error: 'id and action are required' },
        { status: 400 }
      );
    }

    const records = await db.select().from(shorts).where(eq(shorts.id, body.id));
    if (records.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const record = records[0];

    if (body.action === 'resume') {
      void resumeGenerationJob(body.id).catch(async (error) => {
        const message =
          error instanceof Error ? error.message : 'Resume failed';
        await updateStatus(body.id!, 'failed', {
          error: message,
          progressStep: 'failed',
          progressMessage: message,
        }).catch(() => {});
        await appendProgressLog(body.id!, `이어 시도 실패: ${message}`).catch(() => {});
      });

      return NextResponse.json({ ok: true, status: 'pending' });
    }

    const scriptValue = record.script;
    const script =
      typeof scriptValue === 'string'
        ? (JSON.parse(scriptValue) as ScriptResult)
        : (scriptValue as ScriptResult | null);

    if (!script) {
      return NextResponse.json(
        { error: 'script is required to retry' },
        { status: 400 }
      );
    }

    await updateStatus(body.id, 'pending', {
      error: null,
      progressStep: 'queued',
      progressMessage: '재시도 작업이 시작되었습니다',
      progressCurrent: 0,
      progressTotal: 4,
    });
    await appendProgressLog(body.id, '실패한 작업 재시도를 시작했습니다');

    void runVideoPipelineFromScript(body.id, script).catch(async (error) => {
      const message = error instanceof Error ? error.message : 'Retry failed';
      await updateStatus(body.id!, 'failed', {
        error: message,
        progressStep: 'failed',
        progressMessage: message,
      }).catch(() => {});
      await appendProgressLog(body.id!, `재시도 실패: ${message}`).catch(() => {});
    });

    return NextResponse.json({ ok: true, status: 'pending' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Action failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
