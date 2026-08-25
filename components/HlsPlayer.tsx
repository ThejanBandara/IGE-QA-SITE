'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Volume2, VolumeX, AlertCircle, RefreshCw, Radio, User } from 'lucide-react';

interface HlsPlayerProps {
  src: string;
  title: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  poster?: string;
  username?: string;
  viewerCount?: number;
}

export function HlsPlayer({
  src,
  title,
  isMuted = true,
  poster,
  username,
  viewerCount,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(isMuted);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(null);
    setIsLoading(true);

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        video.play().catch(() => {
          // Autoplay policy muted fallback
          video.muted = true;
          setIsAudioMuted(true);
          video.play().catch(() => {});
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('HLS Network Error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Media Error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Unrecoverable HLS error:', data);
              setError('Stream feed disconnected or ended');
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native iOS/Safari HLS
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        video.play().catch(() => {});
      });
      video.addEventListener('error', () => {
        setError('Unable to play HLS stream');
      });
    } else {
      setError('HLS playback is not supported in this browser');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    const nextState = !videoRef.current.muted;
    videoRef.current.muted = nextState;
    setIsAudioMuted(nextState);
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    if (hlsRef.current && src) {
      hlsRef.current.loadSource(src);
      if (videoRef.current) {
        hlsRef.current.attachMedia(videoRef.current);
      }
    }
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group">
      {/* Video Element */}
      <video
        ref={videoRef}
        playsInline
        muted={isAudioMuted}
        poster={poster}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="w-full h-full object-contain bg-black"
      />

      {/* Loading Spinner */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs z-10 space-y-2">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] font-mono text-cyan-300">Connecting to Live Feed...</span>
        </div>
      )}

      {/* Error Fallback State */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 p-4 text-center z-20 space-y-2">
          <AlertCircle className="w-8 h-8 text-rose-400" />
          <p className="text-xs font-semibold text-zinc-200">{error}</p>
          <p className="text-[10px] text-zinc-500 max-w-xs">
            The creator may have ended their broadcast or the stream is currently offline.
          </p>
          <button
            onClick={handleRetry}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs rounded-md border border-zinc-700 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry Connection
          </button>
        </div>
      )}

      {/* Stream Overlay Meta */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 pointer-events-none">
        <span className="px-2 py-0.5 rounded bg-rose-600/90 text-white font-bold text-[10px] flex items-center gap-1 shadow">
          <Radio className="w-3 h-3 animate-pulse" /> LIVE
        </span>
        {viewerCount !== undefined && viewerCount > 0 && (
          <span className="px-2 py-0.5 rounded bg-black/70 border border-zinc-700/80 text-zinc-300 text-[10px] font-mono flex items-center gap-1 backdrop-blur-xs">
            <User className="w-3 h-3 text-cyan-400" />
            {viewerCount.toLocaleString()}
          </span>
        )}
      </div>

      {/* Floating Audio Unmute Button */}
      <div className="absolute bottom-3 right-3 z-20 opacity-90 hover:opacity-100 transition-opacity">
        <button
          onClick={toggleAudio}
          title={isAudioMuted ? 'Click to Unmute' : 'Click to Mute'}
          className={`p-2 rounded-full backdrop-blur-md shadow-lg transition-all ${
            isAudioMuted
              ? 'bg-zinc-900/90 border border-zinc-700 text-zinc-300 hover:bg-zinc-800'
              : 'bg-indigo-600 text-white hover:bg-indigo-500 ring-2 ring-indigo-400/40'
          }`}
        >
          {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
