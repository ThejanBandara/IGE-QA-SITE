'use client';

import React, { useState, useEffect } from 'react';
import { StreamItem } from '@/types/stream';
import { parseStreamUrl } from '@/lib/embedUtils';
import { HlsPlayer } from '@/components/HlsPlayer';
import { 
  RotateCw, 
  Maximize2, 
  Edit3, 
  Trash2, 
  ExternalLink, 
  Video, 
  Radio, 
  Check, 
  X, 
  Volume2,
  Tv
} from 'lucide-react';
import toast from 'react-hot-toast';

interface StreamTileProps {
  stream: StreamItem;
  index: number;
  onUpdateStream: (index: number, updated: Partial<StreamItem>) => void;
  onClearStream: (index: number) => void;
  onFocusStream?: (index: number) => void;
  isFocused?: boolean;
}

export function StreamTile({
  stream,
  index,
  onUpdateStream,
  onClearStream,
  onFocusStream,
  isFocused = false,
}: StreamTileProps) {
  const [reloadKey, setReloadKey] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(stream.title);
  const [editUrl, setEditUrl] = useState(stream.url);
  const [resolvedHlsUrl, setResolvedHlsUrl] = useState<string | null>(stream.hlsUrl || null);
  const [isResolving, setIsResolving] = useState(false);
  const [viewerCount, setViewerCount] = useState<number | undefined>(undefined);
  const [directHlsUrl, setDirectHlsUrl] = useState<string | null>(null);

  // Resolve TikTok Live HLS stream if needed
  useEffect(() => {
    let isCancelled = false;

    if (stream.platform === 'tiktok' && stream.tiktokUsername && !stream.embedUrl) {
      setIsResolving(true);
      fetch(`/api/tiktok-live?username=${encodeURIComponent(stream.tiktokUsername)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!isCancelled) {
            setIsResolving(false);
            if (data.success && data.hlsUrl) {
              // Prefer direct CDN URL as primary — let the browser fetch it with
              // a proper browser origin/referer. Vercel's proxy gets 403 from
              // TikTok CDN because its AWS IPs are blocked server-side.
              const direct = data.directHlsUrl || null;
              const proxied = data.hlsUrl;
              setResolvedHlsUrl(direct || proxied);   // direct first
              setDirectHlsUrl(direct ? proxied : null); // proxied as fallback
              setViewerCount(data.viewerCount);
              if (data.title && (!stream.title || stream.title.startsWith('Feed #'))) {
                onUpdateStream(index, { title: data.title });
              }
            } else {
              setResolvedHlsUrl(null);
              setDirectHlsUrl(null);
            }
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            setIsResolving(false);
            console.error('TikTok live resolve error', err);
          }
        });
    } else if (stream.hlsUrl) {
      setResolvedHlsUrl(stream.hlsUrl);
    } else {
      setResolvedHlsUrl(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [stream.platform, stream.tiktokUsername, stream.hlsUrl, stream.embedUrl, reloadKey]);

  const handleReload = () => {
    setReloadKey((prev) => prev + 1);
    toast.success(`Reloaded Feed ${index + 1}: ${stream.title || 'Stream'}`);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseStreamUrl(editUrl);
    if (!parsed.isValid) {
      toast.error(parsed.error || 'Invalid URL');
      return;
    }

    if (parsed.warning) {
      toast(parsed.warning, { icon: 'ℹ️', duration: 7000 });
    }

    onUpdateStream(index, {
      title: editTitle.trim() || `Stream ${index + 1}`,
      url: editUrl.trim(),
      platform: parsed.platform,
      embedUrl: parsed.embedUrl,
      streamType: parsed.streamType,
      hlsUrl: parsed.hlsUrl,
      tiktokUsername: parsed.tiktokUsername,
    });
    setIsEditing(false);
    toast.success(`Updated Feed #${index + 1}`);
  };

  const handleCancelEdit = () => {
    setEditTitle(stream.title);
    setEditUrl(stream.url);
    setIsEditing(false);
  };

  const platformBadge = () => {
    if (stream.platform === 'tiktok') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-pink-950/80 text-pink-400 border border-pink-700/60 shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          TikTok Live
        </span>
      );
    }
    if (stream.platform === 'youtube') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-red-950/80 text-red-400 border border-red-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          YouTube
        </span>
      );
    }
    if (stream.platform === 'facebook') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-950/80 text-blue-400 border border-blue-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          Facebook
        </span>
      );
    }
    if (stream.platform === 'hls') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          HLS Feed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
        <Radio className="w-3 h-3 text-emerald-400" />
        Live
      </span>
    );
  };

  const isHlsMode = stream.streamType === 'hls' || resolvedHlsUrl !== null;

  return (
    <div
      className={`relative flex flex-col bg-zinc-900/90 rounded-xl overflow-hidden border transition-all duration-200 shadow-lg ${
        isFocused
          ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-indigo-950/40'
          : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      {/* Stream Top Control Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-950/80 border-b border-zinc-800/80 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center justify-center w-6 h-6 rounded bg-zinc-800 text-zinc-300 text-xs font-mono font-bold border border-zinc-700">
            {index + 1}
          </div>
          {platformBadge()}
          <h3
            className="text-xs font-semibold text-zinc-200 truncate max-w-[140px] sm:max-w-[200px] md:max-w-[240px]"
            title={stream.title || `Feed #${index + 1}`}
          >
            {stream.title || `Stream ${index + 1}`}
          </h3>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleReload}
            title="Reload Video Stream"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            title="Edit Stream URL"
            className={`p-1.5 rounded transition-colors ${
              isEditing ? 'text-amber-400 bg-amber-950/50' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          {onFocusStream && (
            <button
              onClick={() => onFocusStream(index)}
              title={isFocused ? 'Exit Focus View' : 'Focus this Stream'}
              className={`p-1.5 rounded transition-colors ${
                isFocused ? 'text-indigo-400 bg-indigo-950/50' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}
          {stream.url && (
            <a
              href={stream.url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open Source Link in New Tab"
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={() => onClearStream(index)}
            title="Clear Stream"
            className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* In-Tile Edit Form (Popover Overlay) */}
      {isEditing && (
        <div className="absolute inset-x-0 top-10 z-30 p-3 bg-zinc-950/95 border-b border-zinc-700 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
          <form onSubmit={handleSaveEdit} className="space-y-2">
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-0.5">Stream Label</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="e.g. Main Stage / TikTok Live / Newsfeed"
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-0.5">
                YouTube, Facebook, or TikTok URL / @username
              </label>
              <input
                type="text"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                placeholder="https://youtube.com/... or https://tiktok.com/@user/live or @username"
                className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Cancel
              </button>
              <button
                type="submit"
                className="px-2.5 py-1 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Save Stream
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Video Stream Container (HLS or Iframe) */}
      <div className="relative flex-1 w-full bg-black min-h-[220px] sm:min-h-[280px] md:min-h-[320px] overflow-hidden flex items-center justify-center">
        {isHlsMode && (resolvedHlsUrl || isResolving) ? (
          <HlsPlayer
            key={reloadKey}
            src={resolvedHlsUrl || ''}
            fallbackSrc={directHlsUrl || undefined}
            title={stream.title}
            username={stream.tiktokUsername}
            viewerCount={viewerCount}
          />
        ) : stream.embedUrl ? (
          <iframe
            key={reloadKey}
            src={stream.embedUrl}
            title={stream.title || `Live Stream ${index + 1}`}
            className="w-full h-full absolute inset-0 border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-3">
            <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center border border-zinc-700/60">
              <Video className="w-6 h-6 text-zinc-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-300">Feed #{index + 1} Inactive</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {stream.platform === 'tiktok' && stream.tiktokUsername
                  ? `@${stream.tiktokUsername} is currently offline`
                  : 'No video stream link configured'}
              </p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 py-1.5 bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-medium rounded-md shadow flex items-center gap-1.5 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" /> Configure Stream
            </button>
          </div>
        )}
      </div>

      {/* Tile Bottom status bar */}
      <div className="px-3 py-1 bg-zinc-950/90 border-t border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping opacity-75" />
          <span className="text-zinc-400 font-mono">
            {stream.platform === 'tiktok' ? 'TIKTOK_HLS_LIVE' : 'FEED_SYNC_OK'}
          </span>
        </span>
        <span className="text-zinc-500 flex items-center gap-1 font-mono">
          <Volume2 className="w-3 h-3 text-zinc-500" />
          {isHlsMode ? 'Use volume control in corner' : 'Click inside stream for sound'}
        </span>
      </div>
    </div>
  );
}
