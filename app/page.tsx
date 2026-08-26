'use client';

import React, { useState, useEffect, useRef } from 'react';
import { StreamItem, TimerItem, AlertLogItem, GridMode } from '@/types/stream';
import { parseStreamUrl, DEMO_STREAMS } from '@/lib/embedUtils';
import { playReminderSound, playCompletionSound } from '@/lib/soundUtils';
import { Header } from '@/components/Header';
import { StreamTile } from '@/components/StreamTile';
import { TimerDrawer } from '@/components/TimerDrawer';
import { SetupModal } from '@/components/SetupModal';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Tv, 
  Plus, 
  Grid2X2, 
  Grid3X3, 
  Clock, 
  Radio, 
  Sparkles, 
  Minimize2, 
  SlidersHorizontal,
  Volume2
} from 'lucide-react';

const STORAGE_KEY_STREAMS = 'social_live_monitor_streams_v1';
const STORAGE_KEY_GRID = 'social_live_monitor_grid_v1';
const STORAGE_KEY_TIMERS = 'social_live_monitor_timers_v1';

export default function LiveMonitorDashboard() {
  const [gridMode, setGridMode] = useState<GridMode>('4');
  const [streams, setStreams] = useState<StreamItem[]>([]);
  const [timers, setTimers] = useState<TimerItem[]>([]);
  const [alertLogs, setAlertLogs] = useState<AlertLogItem[]>([]);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [isTimerDrawerOpen, setIsTimerDrawerOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize from LocalStorage
  useEffect(() => {
    try {
      const savedGrid = localStorage.getItem(STORAGE_KEY_GRID) as GridMode | null;
      const savedStreams = localStorage.getItem(STORAGE_KEY_STREAMS);
      const savedTimers = localStorage.getItem(STORAGE_KEY_TIMERS);

      if (savedGrid === '4' || savedGrid === '6' || savedGrid === '8' || savedGrid === '10') {
        setGridMode(savedGrid);
      }

      if (savedStreams) {
        const parsed = JSON.parse(savedStreams);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStreams(parsed);
        } else {
          loadDefaultStreams(savedGrid || '4');
        }
      } else {
        loadDefaultStreams(savedGrid || '4');
      }

      if (savedTimers) {
        const parsedTimers = JSON.parse(savedTimers);
        if (Array.isArray(parsedTimers)) {
          setTimers(parsedTimers);
        }
      }
    } catch {
      loadDefaultStreams('4');
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const loadDefaultStreams = (mode: GridMode) => {
    const count = mode === '10' ? 10 : mode === '8' ? 8 : mode === '6' ? 6 : 4;
    const initial: StreamItem[] = DEMO_STREAMS.slice(0, count).map((d, i) => {
      const parsed = parseStreamUrl(d.url);
      return {
        id: `stream-slot-${i + 1}`,
        slotIndex: i,
        title: d.title,
        url: d.url,
        platform: parsed.platform,
        embedUrl: parsed.embedUrl,
        streamType: parsed.streamType,
        hlsUrl: parsed.hlsUrl,
        tiktokUsername: parsed.tiktokUsername,
      };
    });
    setStreams(initial);
  };

  // Save changes to localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY_GRID, gridMode);
      localStorage.setItem(STORAGE_KEY_STREAMS, JSON.stringify(streams));
    } catch (e) {
      console.error('Failed saving to localStorage', e);
    }
  }, [gridMode, streams, isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(STORAGE_KEY_TIMERS, JSON.stringify(timers));
    } catch (e) {
      console.error('Failed saving timers to localStorage', e);
    }
  }, [timers, isLoaded]);

  const timersRef = useRef<TimerItem[]>(timers);
  timersRef.current = timers;

  // Timers countdown ticker & alert trigger engine
  useEffect(() => {
    const interval = setInterval(() => {
      const currentList = timersRef.current;
      const triggeredReminders: { timer: TimerItem; msg: string }[] = [];
      const triggeredCompletions: { timer: TimerItem; msg: string }[] = [];

      let hasRunning = false;
      const nextList = currentList.map((timer) => {
        if (!timer.isRunning || timer.remainingSeconds <= 0) {
          return timer;
        }

        hasRunning = true;
        const nextRemaining = timer.remainingSeconds - 1;
        const reminderSec = timer.reminderMinutesBefore * 60;
        let reminderFired: boolean = timer.reminderFired;
        let completedFired: boolean = timer.completedFired;
        let isRunning: boolean = timer.isRunning;

        // Check if Advance Reminder needs to trigger
        if (
          !reminderFired &&
          reminderSec > 0 &&
          nextRemaining <= reminderSec &&
          nextRemaining > 0
        ) {
          reminderFired = true;
          triggeredReminders.push({
            timer,
            msg: `⏰ REMINDER: "${timer.title}" has ${timer.reminderMinutesBefore}m remaining!`,
          });
        }

        // Check if Timer Finished
        if (nextRemaining === 0 && !completedFired) {
          completedFired = true;
          isRunning = false;
          triggeredCompletions.push({
            timer,
            msg: `🚨 TIME'S UP: "${timer.title}" countdown has completed!`,
          });
        }

        return {
          ...timer,
          remainingSeconds: nextRemaining,
          reminderFired,
          completedFired,
          isRunning,
        };
      });

      if (!hasRunning && triggeredReminders.length === 0 && triggeredCompletions.length === 0) {
        return;
      }

      setTimers(nextList);

      // Execute side effects safely outside state updater
      if (triggeredReminders.length > 0) {
        playReminderSound();
        triggeredReminders.forEach(({ timer, msg }) => {
          toast(msg, {
            icon: '⚠️',
            duration: 8000,
            style: {
              background: '#18181b',
              color: '#fef08a',
              border: '1px solid #ca8a04',
              fontWeight: 600,
            },
          });
          setAlertLogs((prev) => [
            {
              id: `log-${Date.now()}-${Math.random()}`,
              timerId: timer.id,
              timerTitle: timer.title,
              type: 'reminder',
              timestamp: Date.now(),
              message: msg,
            },
            ...prev,
          ]);
        });
      }

      if (triggeredCompletions.length > 0) {
        playCompletionSound();
        triggeredCompletions.forEach(({ timer, msg }) => {
          toast.error(msg, {
            duration: 10000,
            style: {
              background: '#270808',
              color: '#fecaca',
              border: '1px solid #b91c1c',
              fontWeight: 700,
            },
          });
          setAlertLogs((prev) => [
            {
              id: `log-${Date.now()}-${Math.random()}`,
              timerId: timer.id,
              timerTitle: timer.title,
              type: 'complete',
              timestamp: Date.now(),
              message: msg,
            },
            ...prev,
          ]);
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handlers for Streams
  const handleUpdateStream = (index: number, updated: Partial<StreamItem>) => {
    setStreams((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], ...updated };
      }
      return next;
    });
  };

  const handleClearStream = (index: number) => {
    setStreams((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          title: `Feed #${index + 1}`,
          url: '',
          embedUrl: '',
          platform: 'custom',
        };
      }
      return next;
    });
    toast.success(`Cleared feed #${index + 1}`);
  };

  const handleChangeGridMode = (mode: GridMode) => {
    setGridMode(mode);
    setFocusedIndex(null);
    const count = mode === '10' ? 10 : mode === '8' ? 8 : mode === '6' ? 6 : 4;
    setStreams((prev) => {
      if (prev.length < count) {
        const next = [...prev];
        while (next.length < count) {
          const idx = next.length;
          const demo = DEMO_STREAMS[idx];
          if (demo) {
            const parsed = parseStreamUrl(demo.url);
            next.push({
              id: `stream-slot-${idx + 1}`,
              slotIndex: idx,
              title: demo.title,
              url: demo.url,
              platform: parsed.platform,
              embedUrl: parsed.embedUrl,
              streamType: parsed.streamType,
              hlsUrl: parsed.hlsUrl,
              tiktokUsername: parsed.tiktokUsername,
            });
          } else {
            next.push({
              id: `stream-slot-${idx + 1}`,
              slotIndex: idx,
              title: `Feed #${idx + 1}`,
              url: '',
              platform: 'custom',
              embedUrl: '',
            });
          }
        }
        return next;
      }
      return prev;
    });
  };

  const handleSaveConfig = (newMode: GridMode, newStreams: StreamItem[]) => {
    setGridMode(newMode);
    setStreams(newStreams);
    setFocusedIndex(null);
  };

  // Handlers for Timers
  const handleAddTimer = (
    timerData: Omit<TimerItem, 'id' | 'remainingSeconds' | 'reminderFired' | 'completedFired' | 'isRunning' | 'createdAt'>
  ) => {
    const newTimer: TimerItem = {
      ...timerData,
      id: `timer-${Date.now()}`,
      remainingSeconds: timerData.targetSeconds,
      reminderFired: false,
      completedFired: false,
      isRunning: true,
      createdAt: Date.now(),
    };
    setTimers((prev) => [newTimer, ...prev]);
  };

  const handleToggleTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t))
    );
  };

  const handleResetTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              remainingSeconds: t.targetSeconds,
              reminderFired: false,
              completedFired: false,
              isRunning: false,
            }
          : t
      )
    );
    toast.success('Timer reset');
  };

  const handleDeleteTimer = (id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
    toast.success('Timer removed');
  };

  const handleAddExtraTime = (id: string, extraSeconds: number) => {
    setTimers((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextSec = t.remainingSeconds + extraSeconds;
          return {
            ...t,
            remainingSeconds: nextSec,
            targetSeconds: Math.max(t.targetSeconds, nextSec),
            completedFired: false,
            // If we added time back past the reminder, allow reminder to fire again
            reminderFired: nextSec > t.reminderMinutesBefore * 60 ? false : t.reminderFired,
          };
        }
        return t;
      })
    );
    toast.success(`Added +${Math.round(extraSeconds / 60)} minute(s)`);
  };

  const activeCount = gridMode === '10' ? 10 : gridMode === '8' ? 8 : gridMode === '6' ? 6 : 4;
  const currentStreams = streams.slice(0, activeCount);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast Provider */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'shadow-2xl font-sans',
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid #27272a',
            borderRadius: '0.75rem',
            padding: '12px 16px',
          },
        }}
      />

      {/* Main Top Header */}
      <Header
        gridMode={gridMode}
        onChangeGridMode={handleChangeGridMode}
        onOpenSetup={() => setIsSetupOpen(true)}
        onOpenTimers={() => setIsTimerDrawerOpen(true)}
        timers={timers}
        streamCount={currentStreams.filter((s) => s.embedUrl).length}
      />

      {/* Main Workspace / Monitoring Arena */}
      <main className="flex-1 p-3 sm:p-4 max-w-[1920px] w-full mx-auto flex flex-col">
        {focusedIndex !== null && currentStreams[focusedIndex] ? (
          /* Focus View Mode (1 Main Large Stream + Mini Thumbnails) */
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center justify-between bg-zinc-900/80 px-4 py-2 rounded-xl border border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                <h2 className="text-sm font-bold text-zinc-100">
                  Focus Mode: {currentStreams[focusedIndex].title}
                </h2>
              </div>
              <button
                onClick={() => setFocusedIndex(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 flex items-center gap-1.5 transition-colors"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Exit Focus View ({gridMode} Grid)
              </button>
            </div>

            <div className="flex-1 min-h-[500px]">
              <StreamTile
                stream={currentStreams[focusedIndex]}
                index={focusedIndex}
                onUpdateStream={handleUpdateStream}
                onClearStream={handleClearStream}
                onFocusStream={() => setFocusedIndex(null)}
                isFocused={true}
              />
            </div>

            {/* Bottom Stream Thumbnails */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {currentStreams.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setFocusedIndex(idx)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    idx === focusedIndex
                      ? 'border-indigo-500 bg-indigo-950/40 ring-1 ring-indigo-500'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-0.5">
                    <span>FEED {idx + 1}</span>
                    {s.platform === 'youtube' && <span className="text-red-400">YT</span>}
                    {s.platform === 'facebook' && <span className="text-blue-400">FB</span>}
                  </div>
                  <div className="text-xs font-semibold text-zinc-200 truncate">
                    {s.title || `Stream ${idx + 1}`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Multi-Stream Grid Mode (4, 6, 8, or 10 Layout) */
          <div
            className={`flex-1 grid gap-3 sm:gap-4 ${
              gridMode === '4'
                ? 'grid-cols-1 md:grid-cols-2 grid-rows-2'
                : gridMode === '6'
                ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                : gridMode === '8'
                ? 'grid-cols-2 md:grid-cols-2 xl:grid-cols-4'
                : 'grid-cols-2 md:grid-cols-2 xl:grid-cols-5'
            }`}
          >
            {currentStreams.map((stream, idx) => (
              <StreamTile
                key={stream.id || idx}
                stream={stream}
                index={idx}
                onUpdateStream={handleUpdateStream}
                onClearStream={handleClearStream}
                onFocusStream={(i) => setFocusedIndex(i)}
                isFocused={false}
              />
            ))}
          </div>
        )}
      </main>

      {/* Slide-out Timer & Alert Drawer */}
      <TimerDrawer
        isOpen={isTimerDrawerOpen}
        onClose={() => setIsTimerDrawerOpen(false)}
        timers={timers}
        alertLogs={alertLogs}
        onAddTimer={handleAddTimer}
        onToggleTimer={handleToggleTimer}
        onResetTimer={handleResetTimer}
        onDeleteTimer={handleDeleteTimer}
        onAddExtraTime={handleAddExtraTime}
      />

      {/* Setup / Configuration Modal */}
      <SetupModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        currentGridMode={gridMode}
        currentStreams={streams}
        onSaveConfig={handleSaveConfig}
      />
    </div>
  );
}
