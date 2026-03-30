import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { execFile, execFileSync } from 'child_process';
import { VIDEO } from '@/config/constants';

export interface SlideSegment {
  type: 'image' | 'title';
  duration: number;
  inputPath?: string;
  title?: string;
  subtitle?: string;
}

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
 * Concatenate multiple video clips into one, trimming each segment to the
 * requested duration so every ranking item cuts exactly on time.
 */
export function concatVideos(
  inputPaths: string[],
  outputPath: string,
  segmentDurations: number[]
): Promise<string> {
  if (inputPaths.every((filePath) => /\.(png|jpe?g|webp)$/i.test(filePath))) {
    return composeImageSlideshow(inputPaths, outputPath, segmentDurations);
  }

  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const concatFilePath = path.join(dir, 'concat.txt');
    const concatContent = inputPaths
      .map((inputPath, index) => {
        const lines = [`file '${path.resolve(inputPath)}'`];
        const duration = segmentDurations[index];

        if (typeof duration === 'number' && duration > 0) {
          lines.push(`duration ${duration}`);
        }

        return lines.join('\n');
      })
      .join('\n');
    fs.writeFileSync(concatFilePath, concatContent);

    ffmpeg()
      .input(concatFilePath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .videoFilter(
        `scale=${VIDEO.WIDTH}:${VIDEO.HEIGHT}:force_original_aspect_ratio=increase,crop=${VIDEO.WIDTH}:${VIDEO.HEIGHT},setsar=1`
      )
      .outputOptions([
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '23',
        '-r', String(VIDEO.FPS),
        '-an',
      ])
      .output(outputPath)
      .on('end', () => {
        fs.unlinkSync(concatFilePath);
        resolve(outputPath);
      })
      .on('error', (err) => reject(new Error(`Video concat failed: ${err.message}`)))
      .run();
  });
}

function composeImageSlideshow(
  inputPaths: string[],
  outputPath: string,
  segmentDurations: number[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const args: string[] = ['-y'];

    inputPaths.forEach((inputPath, index) => {
      const duration = Math.max(1, segmentDurations[index] || 1);
      args.push('-loop', '1', '-t', String(duration), '-i', inputPath);
    });

    const filterParts = inputPaths.map((_, index) => {
      return `[${index}:v]scale=${VIDEO.WIDTH}:${VIDEO.HEIGHT}:force_original_aspect_ratio=increase,crop=${VIDEO.WIDTH}:${VIDEO.HEIGHT},setsar=1,format=yuv420p[v${index}]`;
    });

    const concatInputs = inputPaths.map((_, index) => `[v${index}]`).join('');
    filterParts.push(
      `${concatInputs}concat=n=${inputPaths.length}:v=1:a=0[outv]`
    );

    args.push(
      '-filter_complex',
      filterParts.join(';'),
      '-map',
      '[outv]',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-r',
      String(VIDEO.FPS),
      '-pix_fmt',
      'yuv420p',
      '-an',
      outputPath
    );

    execFile('ffmpeg', args, (error, _stdout, stderr) => {
      if (error) {
        reject(
          new Error(
            `Image slideshow compose failed: ${stderr || error.message}`
          )
        );
        return;
      }

      resolve(outputPath);
    });
  });
}

export function composeSlides(
  slides: SlideSegment[],
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (slides.length === 0) {
      reject(new Error('No slides provided'));
      return;
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const args: string[] = ['-y'];
    const filterParts: string[] = [];
    const concatInputs: string[] = [];

    slides.forEach((slide, index) => {
      const duration = Math.max(1, Number(slide.duration) || 1);

      if (slide.type === 'image') {
        if (!slide.inputPath) {
          reject(new Error(`Slide ${index} is missing an input path`));
          return;
        }

        args.push('-loop', '1', '-t', String(duration), '-i', slide.inputPath);
        filterParts.push(
          `[${index}:v]scale=${VIDEO.WIDTH}:${VIDEO.HEIGHT}:force_original_aspect_ratio=increase,crop=${VIDEO.WIDTH}:${VIDEO.HEIGHT},setsar=1,format=yuv420p,trim=duration=${duration},setpts=PTS-STARTPTS[v${index}]`
        );
      } else {
        args.push(
          '-f',
          'lavfi',
          '-t',
          String(duration),
          '-i',
          `color=c=#111827:s=${VIDEO.WIDTH}x${VIDEO.HEIGHT}:r=${VIDEO.FPS}`
        );

        filterParts.push(
          `[${index}:v]format=yuv420p,trim=duration=${duration},setpts=PTS-STARTPTS[v${index}]`
        );
      }

      concatInputs.push(`[v${index}]`);
    });

    filterParts.push(
      `${concatInputs.join('')}concat=n=${slides.length}:v=1:a=0[outv]`
    );

    args.push(
      '-filter_complex',
      filterParts.join(';'),
      '-map',
      '[outv]',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '23',
      '-r',
      String(VIDEO.FPS),
      '-pix_fmt',
      'yuv420p',
      '-an',
      outputPath
    );

    execFile('ffmpeg', args, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`Slide compose failed: ${stderr || error.message}`));
        return;
      }

      resolve(outputPath);
    });
  });
}

export function concatAudio(
  inputPaths: string[],
  outputPath: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (inputPaths.length === 0) {
      reject(new Error('No audio files provided'));
      return;
    }

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const concatFilePath = path.join(dir, `${path.basename(outputPath)}.concat.txt`);
    const concatContent = inputPaths
      .map((inputPath) => `file '${path.resolve(inputPath)}'`)
      .join('\n');
    fs.writeFileSync(concatFilePath, concatContent);

    execFile(
      'ffmpeg',
      [
        '-y',
        '-f',
        'concat',
        '-safe',
        '0',
        '-i',
        concatFilePath,
        '-c:a',
        'mp3',
        outputPath,
      ],
      (error, _stdout, stderr) => {
        fs.rmSync(concatFilePath, { force: true });

        if (error) {
          reject(new Error(`Audio concat failed: ${stderr || error.message}`));
          return;
        }

        resolve(outputPath);
      }
    );
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
