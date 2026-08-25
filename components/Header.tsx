'use client';

import React, { useState, useEffect } from 'react';
import { GridMode, TimerItem } from '@/types/stream';
import { 
  Tv, 
  Grid2X2, 
  Grid3X3, 
  Clock, 
  SlidersHorizontal, 
  Maximize, 
  Minimize,
  Radio,
  Volume2
} from 'lucide-react';

interface HeaderProps {
  gridMode: GridMode;
  onChangeGridMode: (mode: GridMode) => void;
  onOpenSetup: () => void;
  onOpenTimers: () => void;
  timers: TimerItem[];
  streamCount: number;
}

export function Header({
  gridMode,
  onChangeGridMode,
  onOpenSetup,
  onOpenTimers,
  timers,
  streamCount,
}: HeaderProps) {
  const [timeStr, setTimeStr] = useState('');
  const [utcStr, setUtcStr] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setUtcStr(now.toUTCString().split(' ')[4] + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const activeTimersCount = timers.filter((t) => t.isRunning).length;
  const hasWarningTimer = timers.some(
    (t) => t.isRunning && t.remainingSeconds <= t.reminderMinutesBefore * 60 && t.remainingSeconds > 0
  );

  return (
    <header className="bg-zinc-950/95 border-b border-zinc-800/80 px-4 py-2.5 sticky top-0 z-30 backdrop-blur-md">
      <div className="max-w-[1920px] mx-auto flex items-center justify-between gap-4">
        {/* Brand & Live status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white font-mono">
                  LIVE<span className="text-indigo-400">MONITOR</span>
                </span>
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-[10px] font-semibold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  ONLINE
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 hidden sm:block">
                Social Multi-Stream Broadcast Center
              </p>
            </div>
          </div>
        </div>

        {/* Center: Live Time / UTC Status Bar */}
        <div className="hidden md:flex items-center gap-4 bg-zinc-900/80 px-3.5 py-1.5 rounded-xl border border-zinc-800 text-xs">
          <div className="flex items-center gap-1.5 font-mono text-zinc-200 font-bold">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{timeStr || '--:--:--'}</span>
          </div>
          <span className="text-zinc-600">|</span>
          <div className="font-mono text-[11px] text-zinc-400">
            <span>{utcStr || '--:--:-- UTC'}</span>
          </div>
          <span className="text-zinc-600">|</span>
          <div className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
            <Radio className="w-3 h-3 text-red-500 animate-pulse" />
            <span>{streamCount} Feeds Active</span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* 4 / 6 Grid Switcher */}
          <div className="flex items-center bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => onChangeGridMode('4')}
              title="4-Grid Layout (2x2)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                gridMode === '4'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Grid2X2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">4 Grid</span>
            </button>
            <button
              onClick={() => onChangeGridMode('6')}
              title="6-Grid Layout (3x2)"
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                gridMode === '6'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">6 Grid</span>
            </button>
          </div>

          {/* Setup / Add Feeds Button */}
          <button
            onClick={onOpenSetup}
            title="Configure Stream Links"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 transition-colors shadow"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Configure Feeds</span>
          </button>

          {/* Timers Slide-out Trigger Button */}
          <button
            onClick={onOpenTimers}
            title="Open Timers & Alerts Drawer"
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
              hasWarningTimer
                ? 'bg-amber-600 text-white animate-pulse'
                : activeTimersCount > 0
                ? 'bg-indigo-600 text-white hover:bg-indigo-500'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Timers</span>
            {timers.length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  hasWarningTimer
                    ? 'bg-black text-amber-300 font-bold'
                    : activeTimersCount > 0
                    ? 'bg-indigo-900 text-indigo-200'
                    : 'bg-zinc-900 text-zinc-300'
                }`}
              >
                {timers.length}
              </span>
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors hidden sm:block border border-zinc-800"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
