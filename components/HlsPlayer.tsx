'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { Volume2, VolumeX, AlertCircle, RefreshCw, Radio, User, Smartphone } from 'lucide-react';

interface HlsPlayerProps {
  src: string;
  fallbackSrc?: string;
  title: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  poster?: string;
  username?: string;
  viewerCount?: number;
}

export function HlsPlayer({
  src,
  fallbackSrc,
  title,
  isMuted = true,
  poster,
  username,
  viewerCount,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isAudioMuted, setIsAudioMuted] = useState(isMuted);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);

  // Draw blurred background canvas from video frames (portrait mode only)
  const startBgDraw = useCallback(() => {
    const draw = () => {
      const canvas = bgCanvasRef.current;
      const video = videoRef.current;
      if (canvas && video && video.readyState >= 2 && !video.paused) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
      }
      rafRef.current = window.setTimeout(() => {
        rafRef.current = requestAnimationFrame(draw) as unknown as number;
      }, 400); // ~2.5fps for bg — cheap
    };
    rafRef.current = requestAnimationFrame(draw) as unknown as number;
  }, []);

  const stopBgDraw = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isPortrait && isPlaying) {
      startBgDraw();
    } else {
      stopBgDraw();
    }
    return stopBgDraw;
  }, [isPortrait, isPlaying, startBgDraw, stopBgDraw]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setError(null);
    setIsLoading(true);
    setIsPortrait(false);

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      // Detect TikTok CDN URLs — they need a TikTok referrer
      const isTikTokCdn = src.includes('tiktokcdn') || src.includes('tiktok.com');
      const isFallbackTikTok = fallbackSrc
        ? fallbackSrc.includes('tiktokcdn') || fallbackSrc.includes('tiktok.com')
        : false;

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        liveSyncDurationCount: 3,
        // For TikTok CDN: set referrer so CDN allows browser requests
        ...(isTikTokCdn && {
          fetchSetup: (context, initParams) =>
            new Request(context.url, {
              ...initParams,
              referrerPolicy: 'no-referrer-when-downgrade',
              referrer: 'https://www.tiktok.com/',
              mode: 'cors',
            }),
        }),
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
              // On 403/network failure, attempt fallback to proxy before giving up
              if (
                fallbackSrc &&
                src !== fallbackSrc &&
                (data.response?.code === 403 || data.response?.code === 0)
              ) {
                console.warn(
                  `[HlsPlayer] Network error (${data.response?.code}) on primary, switching to fallback: ${fallbackSrc?.slice(0, 80)}`
                );
                // Reconfigure hls.js without TikTok referrer for proxy URL
                if (!isFallbackTikTok) {
                  hls.destroy();
                  const fallbackHls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 30,
                    liveSyncDurationCount: 3,
                  });
                  hlsRef.current = fallbackHls;
                  fallbackHls.loadSource(fallbackSrc!);
                  fallbackHls.attachMedia(video);
                  fallbackHls.on(Hls.Events.MANIFEST_PARSED, () => {
                    setIsLoading(false);
                    video.play().catch(() => {});
                  });
                  fallbackHls.on(Hls.Events.ERROR, (_e2, d2) => {
                    if (d2.fatal) {
                      setError('Stream feed disconnected or ended');
                      fallbackHls.destroy();
                    }
                  });
                } else {
                  hls.loadSource(fallbackSrc!);
                }
              } else {
                console.warn('[HlsPlayer] Network Error, attempting recovery...');
                hls.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HlsPlayer] Media Error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('[HlsPlayer] Unrecoverable HLS error:', data);
              if (fallbackSrc && src !== fallbackSrc) {
                console.log('[HlsPlayer] Attempting fallback to proxy HLS source...');
                hls.loadSource(fallbackSrc);
              } else {
                setError('Stream feed disconnected or ended');
                hls.destroy();
              }
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

  // Detect portrait orientation from video metadata
  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    const portrait = video.videoHeight > video.videoWidth;
    setIsPortrait(portrait);
  };

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden group">

      {/* ── Blurred Background for Portrait Streams ─────────────────────── */}
      {isPortrait && (
        <canvas
          ref={bgCanvasRef}
          width={160}
          height={90}
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{
            filter: 'blur(18px) brightness(0.35) saturate(1.4)',
            transform: 'scale(1.08)',
            objectFit: 'cover',
          }}
        />
      )}

      {/* ── Main Video Element ────────────────────────────────────────────── */}
      <video
        ref={videoRef}
        playsInline
        muted={isAudioMuted}
        poster={poster}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onLoadedMetadata={handleLoadedMetadata}
        className={
          isPortrait
            ? 'relative z-10 h-full w-auto max-w-full object-contain'
            : 'w-full h-full object-contain bg-black'
        }
      />

      {/* ── Loading Spinner ───────────────────────────────────────────────── */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs z-20 space-y-2">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-[11px] font-mono text-cyan-300">Connecting to Live Feed...</span>
        </div>
      )}

      {/* ── Error State ───────────────────────────────────────────────────── */}
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

      {/* ── Stream Overlay Meta ───────────────────────────────────────────── */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-30 pointer-events-none">
        <span className="px-2 py-0.5 rounded bg-rose-600/90 text-white font-bold text-[10px] flex items-center gap-1 shadow">
          <Radio className="w-3 h-3 animate-pulse" /> LIVE
        </span>
        {isPortrait && (
          <span className="px-1.5 py-0.5 rounded bg-violet-600/90 text-white font-bold text-[10px] flex items-center gap-1 shadow">
            <Smartphone className="w-2.5 h-2.5" /> 9:16
          </span>
        )}
        {viewerCount !== undefined && viewerCount > 0 && (
          <span className="px-2 py-0.5 rounded bg-black/70 border border-zinc-700/80 text-zinc-300 text-[10px] font-mono flex items-center gap-1 backdrop-blur-xs">
            <User className="w-3 h-3 text-cyan-400" />
            {viewerCount.toLocaleString()}
          </span>
        )}
      </div>

      {/* ── Audio Toggle ─────────────────────────────────────────────────── */}
      <div className="absolute bottom-3 right-3 z-30 opacity-90 hover:opacity-100 transition-opacity">
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
