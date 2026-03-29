import type { ScriptResult } from '@/types';
import { VIDEO, TIMING } from '@/config/constants';
import fs from 'fs';
import path from 'path';

interface SubtitleEntry {
  start: number;
  end: number;
  text: string;
}

function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

export function buildSubtitleEntries(script: ScriptResult): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];
  let currentTime = 0;

  // Hook
  entries.push({
    start: currentTime,
    end: currentTime + TIMING.HOOK_DURATION,
    text: script.hook,
  });
  currentTime += TIMING.HOOK_DURATION;

  // Intro
  entries.push({
    start: currentTime,
    end: currentTime + TIMING.INTRO_DURATION,
    text: script.intro,
  });
  currentTime += TIMING.INTRO_DURATION;

  // Items
  for (const item of script.items) {
    const dur = item.duration || TIMING.ITEM_DURATION;
    entries.push({
      start: currentTime,
      end: currentTime + dur,
      text: `${item.rank}위: ${item.title}`,
    });
    currentTime += dur;
  }

  // CTA
  entries.push({
    start: currentTime,
    end: currentTime + TIMING.CTA_DURATION,
    text: script.cta,
  });

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
Style: Default,Arial,60,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,40,40,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const events = entries
    .map(
      (e) =>
        `Dialogue: 0,${formatAssTime(e.start)},${formatAssTime(e.end)},Default,,0,0,0,,${e.text}`
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
