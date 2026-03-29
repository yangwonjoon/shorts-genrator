import { NextResponse } from 'next/server';
import { getVideoService } from '@/lib/providers';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      query: string;
      orientation?: 'portrait' | 'landscape';
      minDuration?: number;
    };

    if (!body.query) {
      return NextResponse.json(
        { error: 'query is required' },
        { status: 400 }
      );
    }

    const videoService = getVideoService();
    const results = await videoService.search({
      query: body.query,
      orientation: body.orientation || 'portrait',
      minDuration: body.minDuration,
    });

    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Video search failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
