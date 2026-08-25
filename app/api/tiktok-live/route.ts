import { NextRequest, NextResponse } from 'next/server';

export interface TikTokLiveResponse {
  success: boolean;
  isLive: boolean;
  username: string;
  title?: string;
  hlsUrl?: string;
  directHlsUrl?: string;
  flvUrl?: string;
  viewerCount?: number;
  coverUrl?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let username = searchParams.get('username') || searchParams.get('url') || '';

  username = username.trim();
  if (username.startsWith('http://') || username.startsWith('https://')) {
    const match = username.match(/tiktok\.com\/@([^/?#]+)/i);
    if (match) {
      username = match[1];
    }
  }
  username = username.replace(/^@/, '').trim();

  if (!username) {
    return NextResponse.json(
      { success: false, isLive: false, username: '', error: 'Username is required' },
      { status: 400 }
    );
  }

  // Endpoints to query in fallback order
  const endpoints = [
    `https://webcast.tiktok.com/webcast/room/info/?aid=1988&sourceType=54&unique_id=${encodeURIComponent(username)}`,
    `https://www.tiktok.com/api-live/user/room/?aid=1988&app_language=en&sourceType=54&uniqueId=${encodeURIComponent(username)}`,
    `https://webcast-va.tiktok.com/webcast/room/info/?aid=1988&unique_id=${encodeURIComponent(username)}`,
  ];

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.tiktok.com/',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
  };

  for (const apiUrl of endpoints) {
    try {
      const response = await fetch(apiUrl, {
        headers,
        cache: 'no-store',
      });

      if (response.ok) {
        const json = await response.json();
        const liveRoom = json?.data?.liveRoom || json?.data?.room || json?.data;

        if (liveRoom && (liveRoom.status === 2 || liveRoom.status === 4 || liveRoom.streamData || liveRoom.title)) {
          const isLive = liveRoom.status === 2 || liveRoom.status === '2';
          const title = liveRoom.title || `@${username} Live Broadcast`;
          const viewerCount = liveRoom.userCount || liveRoom.liveRoomUserInfo?.user?.stats?.followerCount;
          const coverUrl = liveRoom.coverUrl || liveRoom.owner?.avatarThumb;

          let rawHlsUrl: string | undefined;
          const streamDataRaw = liveRoom.streamData?.pull_data?.stream_data || liveRoom.stream_url?.pull_data?.stream_data;

          if (streamDataRaw) {
            try {
              const streamObj =
                typeof streamDataRaw === 'string' ? JSON.parse(streamDataRaw) : streamDataRaw;
              const mainData = streamObj?.data;
              if (mainData) {
                rawHlsUrl =
                  mainData?.hd?.main?.hls ||
                  mainData?.sd?.main?.hls ||
                  mainData?.origin?.main?.hls ||
                  mainData?.ld?.main?.hls;
              }
            } catch (e) {
              console.warn('Failed parsing stream_data JSON', e);
            }
          }

          if (isLive && rawHlsUrl) {
            const cleanHls = rawHlsUrl.replace(/[\\"\s]+$/, '');
            const proxiedUrl = `/api/proxy-stream?url=${encodeURIComponent(cleanHls)}`;

            return NextResponse.json({
              success: true,
              isLive: true,
              username,
              title,
              hlsUrl: proxiedUrl,
              directHlsUrl: cleanHls,
              viewerCount,
              coverUrl,
            });
          }

          return NextResponse.json({
            success: true,
            isLive: false,
            username,
            title,
            error: `@${username} is currently OFFLINE`,
            viewerCount,
            coverUrl,
          });
        }
      }
    } catch (endpointErr) {
      console.warn(`Error querying endpoint ${apiUrl}:`, endpointErr);
    }
  }

  return NextResponse.json({
    success: false,
    isLive: false,
    username,
    error: `Could not retrieve live stream for @${username} (Stream may be offline or restricted)`,
  });
}
