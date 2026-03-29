'use client';

interface VideoPlayerProps {
  videoUrl: string;
  jobId: string;
}

export function VideoPlayer({ videoUrl, jobId }: VideoPlayerProps) {
  return (
    <div className="w-full max-w-sm mx-auto mt-6">
      <div className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden border border-zinc-700">
        <video
          src={videoUrl}
          controls
          className="w-full h-full object-contain"
          playsInline
        />
      </div>
      <div className="flex gap-3 mt-4 justify-center">
        <a
          href={videoUrl}
          download={`shorts-${jobId}.mp4`}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          다운로드
        </a>
      </div>
    </div>
  );
}
