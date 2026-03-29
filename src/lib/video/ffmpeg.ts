import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';
import { VIDEO } from '@/config/constants';

function escapeFilterPath(filePath: string): string {
  return path
    .resolve(filePath)
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/'/g, "\\'");
}

let cachedSubtitleFilter:
  | 'ass'
  | 'subtitles'
  | 'none'
  | null = null;

function getSubtitleFilter(): 'ass' | 'subtitles' | 'none' {
  if (cachedSubtitleFilter) return cachedSubtitleFilter;

  try {
    const output = execFileSync('ffmpeg', ['-filters'], {
      encoding: 'utf-8',
    });

    if (/\bass\b/.test(output)) {
      cachedSubtitleFilter = 'ass';
      return cachedSubtitleFilter;
    }

    if (/\bsubtitles\b/.test(output)) {
      cachedSubtitleFilter = 'subtitles';
      return cachedSubtitleFilter;
    }
  } catch {
    cachedSubtitleFilter = 'none';
    return cachedSubtitleFilter;
  }

  cachedSubtitleFilter = 'none';
  return cachedSubtitleFilter;
}

/**
 * Concatenate multiple video clips into one, scaling to 9:16 format.
 */
export function concatVideos(
  inputPaths: string[],
  outputPath: string,
  totalDuration: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // Create a concat file for ffmpeg
    const concatFilePath = path.join(dir, 'concat.txt');
    const concatContent = inputPaths
      .map((p) => `file '${path.resolve(p)}'`)
      .join('\n');
    fs.writeFileSync(concatFilePath, concatContent);

    ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .videoFilter(
        `scale=${VIDEO.WIDTH}:${VIDEO.HEIGHT}:force_original_aspect_ratio=increase,crop=${VIDEO.WIDTH}:${VIDEO.HEIGHT},setsar=1`
      )
      .outputOptions([
        '-t', String(totalDuration),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-r', String(VIDEO.FPS),
        '-an',
      ])
      .output(outputPath)
      .on('end', () => {
        // Clean up concat file
        fs.unlinkSync(concatFilePath);
        resolve(outputPath);
      })
      .on('error', (err) => reject(new Error(`Video concat failed: ${err.message}`)))
      .run();
  });
}

/**
 * Merge background video + audio + ASS subtitle into final output.
 */
export function composeFinal(
  videoPath: string,
  audioPath: string,
  subtitlePath: string,
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const escapedSubtitlePath = escapeFilterPath(subtitlePath);
    const subtitleFilter = getSubtitleFilter();
    const command = ffmpeg().input(videoPath).input(audioPath);

    if (subtitleFilter === 'ass') {
      command.videoFilter(`ass=filename='${escapedSubtitlePath}'`);
    } else if (subtitleFilter === 'subtitles') {
      command.videoFilter(`subtitles=filename='${escapedSubtitlePath}'`);
    }

    command
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',
        '-movflags', '+faststart',
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) =>
        reject(new Error(`Final compose failed: ${err.message}`))
      )
      .run();
  });
}

/**
 * Get duration of an audio/video file in seconds.
 */
export function getMediaDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}
