import { NextResponse } from 'next/server';
import { getAIService } from '@/lib/providers';
import type { ScriptRequest } from '@/types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ScriptRequest;

    if (!body.topic) {
      return NextResponse.json(
        { error: '주제를 입력해주세요' },
        { status: 400 }
      );
    }

    const aiService = getAIService();
    const script = await aiService.generateScript({
      topic: body.topic,
      language: body.language || 'ko',
      itemCount: body.itemCount || 10,
    });

    return NextResponse.json(script);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Script generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
