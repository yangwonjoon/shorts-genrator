import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { VIDEO } from '@/config/constants';

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

    ffmpeg()
      .input(videoPath)
      .input(audioPath)
      .videoFilter(`ass='${subtitlePath.replace(/'/g, "'\\''")}'`)
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
