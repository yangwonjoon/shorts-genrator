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

    const response = await fetch(
      `${PEXELS_API_URL}/v1/search?${params}`,
      {
        headers: { Authorization: this.apiKey },
      }
    );

    if (!response.ok) {
      throw new Error(`Pexels search failed: ${response.statusText}`);
    }

    const data = await response.json();

    return data.photos.map(
      (photo: {
        id: number;
        width: number;
        height: number;
        src: {
          original?: string;
          large2x?: string;
          large?: string;
          medium?: string;
        };
      }) => {
        const downloadUrl =
          photo.src.large2x ||
          photo.src.large ||
          photo.src.original ||
          photo.src.medium ||
          '';

        return {
          id: String(photo.id),
          downloadUrl,
          duration: request.minDuration || 0,
          width: photo.width,
          height: photo.height,
          previewUrl: photo.src.medium || downloadUrl,
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
      throw new Error(`Failed to download media: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(outputPath, Buffer.from(arrayBuffer));

    return outputPath;
  }
}
