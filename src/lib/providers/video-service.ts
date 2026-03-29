import type { VideoSearchRequest, VideoSearchResult } from '@/types';

export interface VideoService {
  search(request: VideoSearchRequest): Promise<VideoSearchResult[]>;
  download(url: string, outputPath: string): Promise<string>;
}
