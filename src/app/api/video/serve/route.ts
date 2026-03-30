import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shorts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import { Readable } from 'stream';

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
  const fileSize = stat.size;
  const range = request.headers.get('range');

  if (!range) {
    const stream = fs.createReadStream(filePath);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': String(fileSize),
        'Content-Disposition': `inline; filename="${id}.mp4"`,
        'Accept-Ranges': 'bytes',
      },
    });
  }

  const matches = /bytes=(\d*)-(\d*)/.exec(range);
  if (!matches) {
    return new Response(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${fileSize}`,
      },
    });
  }

  const start = matches[1] ? Number.parseInt(matches[1], 10) : 0;
  const end = matches[2] ? Number.parseInt(matches[2], 10) : fileSize - 1;

  if (
    Number.isNaN(start) ||
    Number.isNaN(end) ||
    start < 0 ||
    end >= fileSize ||
    start > end
  ) {
    return new Response(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${fileSize}`,
      },
    });
  }

  const chunkSize = end - start + 1;
  const stream = fs.createReadStream(filePath, { start, end });

  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 206,
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': String(chunkSize),
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `inline; filename="${id}.mp4"`,
    },
  });
}
