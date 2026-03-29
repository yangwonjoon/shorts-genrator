import type { VideoService } from './video-service';
import type { VideoSearchRequest, VideoSearchResult } from '@/types';
import fs from 'fs';
import path from 'path';

const PEXELS_API_URL = 'https://api.pexels.com';

export class PexelsProvider implements VideoService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.PEXELS_API_KEY;
    if (!apiKey) throw new Error('PEXELS_API_KEY is not set');
    this.apiKey = apiKey;
  }

  async search(request: VideoSearchRequest): Promise<VideoSearchResult[]> {
    const params = new URLSearchParams({
      query: request.query,
      orientation: request.orientation || 'portrait',
      per_page: '5',
    });

    if (request.minDuration) {
      params.set('min_duration', String(request.minDuration));
    }

    const response = await fetch(
      `${PEXELS_API_URL}/videos/search?${params}`,
      {
        headers: { Authorization: this.apiKey },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels search failed: ${response.statusText}`);
    }

    const data = await response.json();

    return data.videos.map(
      (video: {
        id: number;
        duration: number;
        video_files: { link: string; width: number; height: number }[];
        video_pictures: { picture: string }[];
      }) => {
        // Prefer HD portrait video file
        const file =
          video.video_files.find(
            (f: { width: number; height: number }) =>
              f.height >= 1080 && f.width <= f.height
          ) || video.video_files[0];

        return {
          id: String(video.id),
          downloadUrl: file.link,
          duration: video.duration,
          width: file.width,
          height: file.height,
          previewUrl: video.video_pictures?.[0]?.picture || '',
        };
      }
    );
  }

  async download(url: string, outputPath: string): Promise<string> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));

    return outputPath;
  }
}
