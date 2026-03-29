import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shorts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const records = await db.select().from(shorts).where(eq(shorts.id, id));
  if (records.length === 0 || !records[0].finalPath) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  const filePath = records[0].finalPath;
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Video file not found' }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  return new Response(fileBuffer, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(stat.size),
      'Content-Disposition': `inline; filename="${id}.mp4"`,
    },
  });
}
