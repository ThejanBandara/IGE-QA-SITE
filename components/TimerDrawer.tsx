'use client';

import React, { useState } from 'react';
import { TimerItem, AlertLogItem } from '@/types/stream';
import { 
  X, 
  Plus, 
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  Bell, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Flame,
  Volume2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TimerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  timers: TimerItem[];
  alertLogs: AlertLogItem[];
  onAddTimer: (timer: Omit<TimerItem, 'id' | 'remainingSeconds' | 'reminderFired' | 'completedFired' | 'isRunning' | 'createdAt'>) => void;
  onToggleTimer: (id: string) => void;
  onResetTimer: (id: string) => void;
  onDeleteTimer: (id: string) => void;
  onAddExtraTime: (id: string, extraSeconds: number) => void;
}

const COLOR_OPTIONS = [
  { name: 'Indigo', bg: 'bg-indigo-500', border: 'border-indigo-500', text: 'text-indigo-400', hex: '#6366f1' },
  { name: 'Emerald', bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-400', hex: '#10b981' },
  { name: 'Amber', bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-400', hex: '#f59e0b' },
  { name: 'Rose', bg: 'bg-rose-500', border: 'border-rose-500', text: 'text-rose-400', hex: '#f43f5e' },
  { name: 'Cyan', bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-400', hex: '#06b6d4' },
  { name: 'Purple', bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-400', hex: '#a855f7' },
];

export function TimerDrawer({
  isOpen,
  onClose,
  timers,
  alertLogs,
  onAddTimer,
  onToggleTimer,
  onResetTimer,
  onDeleteTimer,
  onAddExtraTime,
}: TimerDrawerProps) {
  const [activeTab, setActiveTab] = useState<'timers' | 'create' | 'logs'>('timers');

  // New Timer Form State
  const [title, setTitle] = useState('');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(15);
  const [seconds, setSeconds] = useState(0);
  const [reminderMinutes, setReminderMinutes] = useState(2);
  const [selectedColor, setSelectedColor] = useState('#6366f1');

  const formatTime = (totalSec: number) => {
    if (totalSec < 0) totalSec = 0;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCreateTimer = (e: React.FormEvent) => {
    e.preventDefault();
    const totalSec = hours * 3600 + minutes * 60 + seconds;
    if (totalSec <= 0) {
      toast.error('Please enter a duration greater than 0');
      return;
    }

    const timerTitle = title.trim() || `Broadcast Timer #${timers.length + 1}`;
    const remMin = Math.max(0, reminderMinutes);

    onAddTimer({
      title: timerTitle,
      targetSeconds: totalSec,
      reminderMinutesBefore: remMin,
      color: selectedColor,
    });

    toast.success(`Created timer: ${timerTitle}`);
    setTitle('');
    setActiveTab('timers');
  };

  const applyPreset = (m: number, rem: number, label: string) => {
    setHours(0);
    setMinutes(m);
    setSeconds(0);
    setReminderMinutes(rem);
    setTitle(label);
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300"
        />
      )}

      {/* Slide-out Drawer Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-full sm:w-[420px] md:w-[480px] bg-zinc-950/95 border-l border-zinc-800 shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-out backdrop-blur-xl ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                Live Timers & Alerts
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 font-mono font-semibold border border-indigo-800">
                  {timers.length}
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Manage stream countdowns and advance notifications</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-zinc-800 bg-zinc-900/40 px-5 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('timers')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'timers'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Active Timers ({timers.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'create'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            New Timer
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'logs'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Alerts Log ({alertLogs.length})
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* TAB 1: Timers List */}
          {activeTab === 'timers' && (
            <div className="space-y-3.5">
              {timers.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 text-zinc-500 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <Clock className="w-7 h-7 text-zinc-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-300">No Timers Running</h4>
                    <p className="text-xs text-zinc-500 max-w-xs mt-1">
                      Set segment countdowns with custom advance reminder toasts (e.g. 2 min before).
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Create First Timer
                  </button>
                </div>
              ) : (
                timers.map((timer) => {
                  const percent = Math.min(
                    100,
                    Math.max(0, ((timer.targetSeconds - timer.remainingSeconds) / timer.targetSeconds) * 100)
                  );
                  const isFinished = timer.remainingSeconds === 0;
                  const isWarning =
                    !isFinished &&
                    timer.remainingSeconds <= timer.reminderMinutesBefore * 60;

                  return (
                    <div
                      key={timer.id}
                      className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 transition-all shadow-md relative overflow-hidden"
                      style={{ borderLeftColor: timer.color, borderLeftWidth: '4px' }}
                    >
                      {/* Top Timer Meta */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: timer.color }}
                          />
                          <h4 className="text-sm font-bold text-zinc-100 truncate">{timer.title}</h4>
                        </div>
                        {isFinished ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-950 text-rose-400 border border-rose-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> EXPIRED
                          </span>
                        ) : isWarning ? (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-950 text-amber-400 border border-amber-800 animate-pulse flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> REMINDER ACTIVE
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400 font-mono">
                            Total: {formatTime(timer.targetSeconds)}
                          </span>
                        )}
                      </div>

                      {/* Giant Countdown Display */}
                      <div className="flex items-baseline justify-between my-2">
                        <span
                          className={`font-mono text-3xl font-black tracking-tight ${
                            isFinished
                              ? 'text-rose-500'
                              : isWarning
                              ? 'text-amber-400 animate-pulse'
                              : 'text-zinc-100'
                          }`}
                        >
                          {formatTime(timer.remainingSeconds)}
                        </span>
                        {timer.reminderMinutesBefore > 0 && (
                          <span className="text-[11px] text-zinc-400 flex items-center gap-1 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                            <Bell className="w-3 h-3 text-amber-400" />
                            Alert {timer.reminderMinutesBefore}m before
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden my-2.5 border border-zinc-800">
                        <div
                          className="h-full transition-all duration-300 ease-linear rounded-full"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: isFinished ? '#ef4444' : isWarning ? '#f59e0b' : timer.color,
                          }}
                        />
                      </div>

                      {/* Timer Actions */}
                      <div className="flex items-center justify-between pt-1 gap-1">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onToggleTimer(timer.id)}
                            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                              timer.isRunning
                                ? 'bg-amber-600/80 hover:bg-amber-600 text-white'
                                : 'bg-emerald-600/80 hover:bg-emerald-600 text-white'
                            }`}
                          >
                            {timer.isRunning ? (
                              <>
                                <Pause className="w-3.5 h-3.5" /> Pause
                              </>
                            ) : (
                              <>
                                <Play className="w-3.5 h-3.5" /> Start
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => onResetTimer(timer.id)}
                            title="Reset Timer"
                            className="p-1.5 text-zinc-400 hover:text-zinc-100 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onAddExtraTime(timer.id, 60)}
                            title="Add +1 Minute"
                            className="px-2 py-1 text-[11px] font-mono font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                          >
                            +1m
                          </button>
                          <button
                            onClick={() => onAddExtraTime(timer.id, 300)}
                            title="Add +5 Minutes"
                            className="px-2 py-1 text-[11px] font-mono font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                          >
                            +5m
                          </button>
                        </div>
                        <button
                          onClick={() => onDeleteTimer(timer.id)}
                          title="Delete Timer"
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-md transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Create Timer Form */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateTimer} className="space-y-4">
              {/* Quick Presets */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Quick Presets</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset(5, 1, '5m Quick Segment')}
                    className="p-2 text-left bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 hover:border-zinc-700 text-xs"
                  >
                    <div className="font-semibold text-zinc-200">5 Min</div>
                    <div className="text-[10px] text-amber-400">1m Alert</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(15, 2, '15m Live Q&A')}
                    className="p-2 text-left bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 hover:border-zinc-700 text-xs"
                  >
                    <div className="font-semibold text-zinc-200">15 Min</div>
                    <div className="text-[10px] text-amber-400">2m Alert</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPreset(30, 5, '30m Main Keynote')}
                    className="p-2 text-left bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 hover:border-zinc-700 text-xs"
                  >
                    <div className="font-semibold text-zinc-200">30 Min</div>
                    <div className="text-[10px] text-amber-400">5m Alert</div>
                  </button>
                </div>
              </div>

              {/* Timer Title */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Timer Label / Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Speaker Q&A / Ad Break / Stream Switch"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Duration Inputs */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Duration (Hours / Minutes / Seconds)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-[10px] text-zinc-500 mb-0.5">Hours</span>
                    <input
                      type="number"
                      min={0}
                      max={23}
                      value={hours}
                      onChange={(e) => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-center font-mono text-zinc-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 mb-0.5">Minutes</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={minutes}
                      onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-center font-mono text-zinc-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <span className="block text-[10px] text-zinc-500 mb-0.5">Seconds</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      value={seconds}
                      onChange={(e) => setSeconds(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-center font-mono text-zinc-100 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Advance Reminder Alert Setting */}
              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 space-y-2">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  <label className="text-xs font-bold text-amber-300">
                    Advance Reminder Toast Alert
                  </label>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Show a <span className="text-amber-400 font-semibold">react-hot-toast alert</span> and play a chime warning before the timer reaches 0:
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={reminderMinutes}
                    onChange={(e) => setReminderMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-20 px-2.5 py-1.5 bg-zinc-900 border border-amber-700/60 rounded-lg text-sm font-mono text-amber-200 text-center focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs font-medium text-zinc-300">
                    minutes before timer ends
                  </span>
                </div>
                <div className="flex gap-1.5 pt-1">
                  {[1, 2, 3, 5].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setReminderMinutes(m)}
                      className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors ${
                        reminderMinutes === m
                          ? 'bg-amber-500 text-black font-bold border-amber-400'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">Color Tag</label>
                <div className="flex items-center gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => setSelectedColor(c.hex)}
                      className={`w-7 h-7 rounded-full transition-transform ${c.bg} ${
                        selectedColor === c.hex
                          ? 'ring-2 ring-white scale-110 shadow-lg'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('timers')}
                  className="px-3.5 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-lg flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Start Timer
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Alerts Log */}
          {activeTab === 'logs' && (
            <div className="space-y-2.5">
              {alertLogs.length === 0 ? (
                <div className="text-center py-10 text-zinc-500 space-y-2">
                  <Bell className="w-8 h-8 mx-auto text-zinc-600" />
                  <p className="text-xs">No alerts triggered yet</p>
                </div>
              ) : (
                alertLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                      log.type === 'reminder'
                        ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                        : 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                    }`}
                  >
                    {log.type === 'reminder' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <Flame className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-zinc-100">{log.message}</p>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            Audio Chimes Enabled
          </span>
          <button
            onClick={() => setActiveTab('create')}
            className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Timer
          </button>
        </div>
      </div>
    </>
  );
}
