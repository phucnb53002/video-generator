'use client';

interface VideoPlayerProps {
  videoUrl: string;
  thumbnailUrl?: string;
}

export default function VideoPlayer({ videoUrl, thumbnailUrl }: VideoPlayerProps) {
  return (
    <div className="space-y-4">
      <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
        <video
          src={videoUrl}
          controls
          className="w-full h-full"
          poster={thumbnailUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>
      <div className="flex gap-3">
        <a
          href={videoUrl}
          download="heygen-video.mp4"
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Video
        </a>
      </div>
    </div>
  );
}
