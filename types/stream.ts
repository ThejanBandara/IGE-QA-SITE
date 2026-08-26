export type PlatformType = 'youtube' | 'facebook' | 'tiktok' | 'hls' | 'custom';

export type GridMode = '4' | '6' | '8' | '10';

export interface StreamItem {
  id: string;
  slotIndex: number;
  title: string;
  url: string;
  platform: PlatformType;
  embedUrl: string;
  streamType?: 'iframe' | 'hls';
  hlsUrl?: string;
  tiktokUsername?: string;
  isMuted?: boolean;
  notes?: string;
}

export interface TimerItem {
  id: string;
  title: string;
  targetSeconds: number; // total duration
  remainingSeconds: number;
  reminderMinutesBefore: number; // X minutes before end
  reminderFired: boolean;
  completedFired: boolean;
  isRunning: boolean;
  color: string; // color theme
  createdAt: number;
}

export interface AlertLogItem {
  id: string;
  timerId: string;
  timerTitle: string;
  type: 'reminder' | 'complete';
  timestamp: number;
  message: string;
}
