import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createGenerationJob, runVideoPipelineFromScript, updateStatus } from '@/lib/generation/pipeline';
import { validateScriptResult } from '@/lib/script/validation';
import type {
  GenerateResponse,
  ManualVideoSelection,
  ScriptResult,
} from '@/types';

export async function POST(request: Request) {
  const jobId = uuidv4();

  try {
    const body = (await request.json()) as {
      topic?: string;
      script?: ScriptResult;
      videoSelections?: ManualVideoSelection[];
    };

    const validation = validateScriptResult(body.script);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const script = validation.script;
    const topic = body.topic?.trim() || script.metadata.title || script.items[0]?.title;

    if (!topic) {
      return NextResponse.json(
        { error: 'topic 또는 script.metadata.title이 필요합니다' },
        { status: 400 }
      );
    }

    await createGenerationJob(jobId, topic, 'script');

    void runVideoPipelineFromScript(jobId, script, body.videoSelections || []).catch(
      async (error) => {
        const message =
          error instanceof Error ? error.message : 'Generation failed';
        await updateStatus(jobId, 'failed', {
          error: message,
          progressStep: 'failed',
          progressMessage: message,
        }).catch(() => {});
      }
    );

    const response: GenerateResponse = {
      id: jobId,
      status: 'pending',
      progressStep: 'queued',
      progressMessage: '생성 작업이 시작되었습니다',
      progressCurrent: 0,
      progressTotal: 4,
      script,
    };

    return NextResponse.json(response);
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
