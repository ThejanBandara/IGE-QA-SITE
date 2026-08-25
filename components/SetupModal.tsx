'use client';

import React, { useState, useEffect } from 'react';
import { StreamItem, GridMode } from '@/types/stream';
import { parseStreamUrl, DEMO_STREAMS } from '@/lib/embedUtils';
import { 
  Grid2X2, 
  Grid3X3, 
  Sparkles, 
  Check, 
  X, 
  Tv, 
  Radio, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGridMode: GridMode;
  currentStreams: StreamItem[];
  onSaveConfig: (gridMode: GridMode, streams: StreamItem[]) => void;
}

export function SetupModal({
  isOpen,
  onClose,
  currentGridMode,
  currentStreams,
  onSaveConfig,
}: SetupModalProps) {
  const [gridMode, setGridMode] = useState<GridMode>(currentGridMode || '4');
  const targetCount = gridMode === '4' ? 4 : 6;

  // Initialize input slots
  const [slots, setSlots] = useState<{ title: string; url: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      setGridMode(currentGridMode || '4');
      const count = currentGridMode === '6' ? 6 : 4;
      const initialSlots = Array.from({ length: count }, (_, i) => ({
        title: currentStreams[i]?.title || `Feed #${i + 1}`,
        url: currentStreams[i]?.url || '',
      }));
      setSlots(initialSlots);
    }
  }, [isOpen, currentGridMode, currentStreams]);

  const handleGridModeChange = (mode: GridMode) => {
    setGridMode(mode);
    const count = mode === '4' ? 4 : 6;
    setSlots((prev) => {
      const next = [...prev];
      if (next.length < count) {
        while (next.length < count) {
          next.push({ title: `Feed #${next.length + 1}`, url: '' });
        }
      } else {
        return next.slice(0, count);
      }
      return next;
    });
  };

  const handleSlotChange = (index: number, field: 'title' | 'url', value: string) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleLoadDemo = () => {
    const count = targetCount;
    const demoFilled = DEMO_STREAMS.slice(0, count).map((d, i) => ({
      title: d.title,
      url: d.url,
    }));
    setSlots(demoFilled);
    toast.success(`Loaded ${count} verified live stream feeds!`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const formattedStreams: StreamItem[] = slots.map((slot, index) => {
      const parsed = parseStreamUrl(slot.url);
      return {
        id: `stream-slot-${index + 1}`,
        slotIndex: index,
        title: slot.title.trim() || `Feed #${index + 1}`,
        url: slot.url.trim(),
        platform: parsed.platform,
        embedUrl: parsed.embedUrl,
        streamType: parsed.streamType,
        hlsUrl: parsed.hlsUrl,
        tiktokUsername: parsed.tiktokUsername,
      };
    });

    onSaveConfig(gridMode, formattedStreams);
    toast.success(`Active grid configured with ${targetCount} streams!`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">Configure Live Monitoring Grid</h2>
              <p className="text-xs text-zinc-400">
                Choose 4 or 6 streams and paste YouTube or Facebook Live links.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step 1: Grid Mode Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
              1. Select Monitor Grid Layout
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleGridModeChange('4')}
                className={`p-4 rounded-xl border flex items-center gap-3.5 text-left transition-all ${
                  gridMode === '4'
                    ? 'border-indigo-500 bg-indigo-950/30 ring-2 ring-indigo-500/40'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-zinc-800 text-indigo-400">
                  <Grid2X2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">4 Streams Grid (2x2)</h4>
                  <p className="text-xs text-zinc-400">Optimal for 4 primary live broadcast feeds</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleGridModeChange('6')}
                className={`p-4 rounded-xl border flex items-center gap-3.5 text-left transition-all ${
                  gridMode === '6'
                    ? 'border-indigo-500 bg-indigo-950/30 ring-2 ring-indigo-500/40'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                }`}
              >
                <div className="p-2.5 rounded-lg bg-zinc-800 text-indigo-400">
                  <Grid3X3 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-100">6 Streams Grid (3x2)</h4>
                  <p className="text-xs text-zinc-400">High-density multi-view monitor wall</p>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Demo Loader & Instructions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3 rounded-xl bg-zinc-900/70 border border-zinc-800">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Supports standard YouTube links, YouTube /live, and Facebook Video URLs.</span>
            </div>
            <button
              type="button"
              onClick={handleLoadDemo}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Fill with Demo Streams
            </button>
          </div>

          {/* Step 2: Stream Slot Inputs */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2.5">
              2. Configure Feeds ({targetCount} Slots)
            </label>
            <div className="space-y-3">
              {slots.slice(0, targetCount).map((slot, i) => {
                const parsed = parseStreamUrl(slot.url);
                return (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded bg-zinc-800 text-[11px] font-mono font-bold text-zinc-300 border border-zinc-700">
                          {i + 1}
                        </span>
                        <input
                          type="text"
                          value={slot.title}
                          onChange={(e) => handleSlotChange(i, 'title', e.target.value)}
                          placeholder={`Feed #${i + 1} Title`}
                          className="bg-transparent text-xs font-semibold text-zinc-200 focus:outline-none border-b border-transparent focus:border-indigo-500 px-1 py-0.5"
                        />
                      </div>
                      {slot.url && (
                        <div>
                          {parsed.platform === 'tiktok' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-950 text-pink-400 border border-pink-700">
                              TikTok Live
                            </span>
                          ) : parsed.platform === 'youtube' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-950 text-red-400 border border-red-800">
                              YouTube
                            </span>
                          ) : parsed.platform === 'facebook' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-400 border border-blue-800">
                              Facebook
                            </span>
                          ) : parsed.platform === 'hls' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                              HLS Stream
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-zinc-800 text-zinc-400">
                              Custom Link
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        value={slot.url}
                        onChange={(e) => handleSlotChange(i, 'url', e.target.value)}
                        placeholder="Paste YouTube, Facebook, TikTok (@user/live or @user), or .m3u8 URL"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-colors"
            >
              <Check className="w-4 h-4" /> Save & Launch Grid
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
