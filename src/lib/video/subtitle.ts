import type { ScriptResult } from '@/types';
import { VIDEO, TIMING } from '@/config/constants';
import fs from 'fs';
import path from 'path';

interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
  style?: 'Hero' | 'Default' | 'Rank';
}

export interface TimedSubtitleSegment {
  duration: number;
  text: string;
  style?: 'Hero' | 'Default' | 'Rank';
}

function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

export function buildSubtitleEntries(script: ScriptResult): SubtitleEntry[] {
  const segments: TimedSubtitleSegment[] = [
    {
      duration: TIMING.HOOK_DURATION,
      text: script.hook,
      style: 'Hero',
    },
    {
      duration: TIMING.INTRO_DURATION,
      text: script.intro,
      style: 'Default',
    },
    ...script.items.map((item) => ({
      duration: item.duration || TIMING.ITEM_DURATION,
      text: `{\\fs92\\b1}${item.rank}위\\N{\\fs66}${item.title}`,
      style: 'Rank' as const,
    })),
    {
      duration: TIMING.CTA_DURATION,
      text: script.cta,
      style: 'Hero',
    },
  ];

  return buildSubtitleEntriesFromSegments(segments);
}

export function buildSubtitleEntriesFromSegments(
  segments: TimedSubtitleSegment[]
): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  let currentTime = 0;

  for (const segment of segments) {
    const dur = Math.max(0.8, segment.duration || 0);
    entries.push({
      start: currentTime,
      end: currentTime + dur,
      text: segment.text,
      style: segment.style || 'Default',
    });
    currentTime += dur;
  }

  return entries;
}

export function generateAssSubtitle(
  entries: SubtitleEntry[],
  outputPath: string
): string {
  const header = `[Script Info]
Title: Shorts Subtitle
ScriptType: v4.00+
PlayResX: ${VIDEO.WIDTH}
PlayResY: ${VIDEO.HEIGHT}
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,58,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,50,50,120,1
Style: Hero,Arial,70,&H00FFFFFF,&H000000FF,&H00000000,&H8C000000,-1,0,0,0,100,100,0,0,1,4,1,2,50,50,180,1
Style: Rank,Arial,66,&H00FFFFFF,&H000000FF,&H00000000,&H9A000000,-1,0,0,0,100,100,0,0,1,4,1,8,60,60,220,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const events = entries
    .map(
      (e) =>
        `Dialogue: 0,${formatAssTime(e.start)},${formatAssTime(e.end)},${e.style || 'Default'},,0,0,0,,${e.text}`
    )
    .join('\n');

  const content = `${header}\n${events}\n`;

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(outputPath, content, 'utf-8');
  return outputPath;
}
