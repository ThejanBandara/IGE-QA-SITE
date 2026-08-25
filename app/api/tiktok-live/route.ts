import { NextRequest, NextResponse } from 'next/server';

// Run in non-US regions — Vercel's US (iad1) AWS IPs are blocked by TikTok CDN
export const preferredRegion = ['sin1', 'hnd1', 'fra1'];

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
  debug?: object;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let username = searchParams.get('username') || searchParams.get('url') || '';
  const showDebug = searchParams.get('debug') === '1';

  username = username.trim();
  if (username.startsWith('http://') || username.startsWith('https://')) {
    const match = username.match(/tiktok\.com\/@([^/?#]+)/i);
    if (match) {
      username = match[1];
    }
  }
  username = username.replace(/^@/, '').trim();

  console.log(`[tiktok-live] Request started for username: "${username}"`);

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

  const requestHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.tiktok.com/',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
  };

  const debugLog: Record<string, unknown>[] = [];

  for (let i = 0; i < endpoints.length; i++) {
    const apiUrl = endpoints[i];
    const endpointLabel = `endpoint[${i}]`;
    console.log(`[tiktok-live] Trying ${endpointLabel}: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl, {
        headers: requestHeaders,
        cache: 'no-store',
      });

      const httpStatus = response.status;
      const responseHeaders = Object.fromEntries(response.headers.entries());
      console.log(`[tiktok-live] ${endpointLabel} HTTP status: ${httpStatus}`);

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '<unreadable>');
        console.warn(`[tiktok-live] ${endpointLabel} NON-OK response body (first 500 chars): ${bodyText.slice(0, 500)}`);
        debugLog.push({ endpoint: apiUrl, httpStatus, responseHeaders, error: `HTTP ${httpStatus}`, body: bodyText.slice(0, 500) });
        continue;
      }

      const contentType = responseHeaders['content-type'] || '';
      console.log(`[tiktok-live] ${endpointLabel} Content-Type: ${contentType}`);

      let json: Record<string, unknown>;
      try {
        json = await response.json();
      } catch (parseErr) {
        console.warn(`[tiktok-live] ${endpointLabel} JSON parse failed:`, parseErr);
        debugLog.push({ endpoint: apiUrl, httpStatus, error: 'JSON parse failed', parseErr: String(parseErr) });
        continue;
      }

      const liveRoom = (json?.data as Record<string, unknown>)?.liveRoom || (json?.data as Record<string, unknown>)?.room || json?.data;
      console.log(`[tiktok-live] ${endpointLabel} liveRoom.status:`, (liveRoom as Record<string, unknown>)?.status);
      console.log(`[tiktok-live] ${endpointLabel} liveRoom keys:`, liveRoom ? Object.keys(liveRoom as object).join(', ') : 'null/undefined');

      if (liveRoom && ((liveRoom as Record<string, unknown>).status === 2 || (liveRoom as Record<string, unknown>).status === 4 || (liveRoom as Record<string, unknown>).streamData || (liveRoom as Record<string, unknown>).title)) {
        const isLive = (liveRoom as Record<string, unknown>).status === 2 || (liveRoom as Record<string, unknown>).status === '2';
        const title = (liveRoom as Record<string, unknown>).title as string || `@${username} Live Broadcast`;
        const viewerCount = (liveRoom as Record<string, unknown>).userCount as number || ((liveRoom as Record<string, unknown>).liveRoomUserInfo as Record<string, unknown>)?.user as number;
        const coverUrl = (liveRoom as Record<string, unknown>).coverUrl as string || ((liveRoom as Record<string, unknown>).owner as Record<string, unknown>)?.avatarThumb as string;

        console.log(`[tiktok-live] ${endpointLabel} isLive: ${isLive}, title: ${title}`);

        let rawHlsUrl: string | undefined;
        const streamDataRaw =
          ((liveRoom as Record<string, unknown>).streamData as Record<string, unknown>)?.pull_data as Record<string, unknown>
            ? (((liveRoom as Record<string, unknown>).streamData as Record<string, unknown>).pull_data as Record<string, unknown>).stream_data as string
            : ((liveRoom as Record<string, unknown>).stream_url as Record<string, unknown>)?.pull_data as Record<string, unknown>
            ? (((liveRoom as Record<string, unknown>).stream_url as Record<string, unknown>).pull_data as Record<string, unknown>).stream_data as string
            : undefined;

        console.log(`[tiktok-live] ${endpointLabel} streamDataRaw present: ${!!streamDataRaw}`);

        if (streamDataRaw) {
          try {
            const streamObj =
              typeof streamDataRaw === 'string' ? JSON.parse(streamDataRaw) : streamDataRaw;
            const mainData = (streamObj as Record<string, unknown>)?.data as Record<string, Record<string, unknown>>;

            // ── Log the raw streamObj structure for debugging ──────────────────
            console.log(`[tiktok-live] ${endpointLabel} streamObj top-level keys: ${Object.keys(streamObj || {}).join(', ')}`);

            if (mainData) {
              const qualities = Object.keys(mainData);
              console.log(`[tiktok-live] ${endpointLabel} Available quality keys: ${qualities.join(', ')}`);

              // Log the structure of each quality to find the actual HLS path
              for (const q of qualities) {
                const qualityObj = mainData[q];
                if (qualityObj && typeof qualityObj === 'object') {
                  console.log(`[tiktok-live] ${endpointLabel} quality["${q}"] keys: ${Object.keys(qualityObj).join(', ')}`);
                  // Log one level deeper for 'main' if it exists
                  const mainStream = qualityObj.main as Record<string, unknown>;
                  if (mainStream && typeof mainStream === 'object') {
                    console.log(`[tiktok-live] ${endpointLabel} quality["${q}"].main keys: ${Object.keys(mainStream).join(', ')}`);
                    console.log(`[tiktok-live] ${endpointLabel} quality["${q}"].main.hls: ${String(mainStream.hls || 'MISSING').slice(0, 120)}`);
                    console.log(`[tiktok-live] ${endpointLabel} quality["${q}"].main.flv: ${String(mainStream.flv || 'MISSING').slice(0, 120)}`);
                  } else {
                    // Try hls/flv/url_list directly on the quality object
                    console.log(`[tiktok-live] ${endpointLabel} quality["${q}"].hls: ${String(qualityObj.hls || 'MISSING').slice(0, 120)}`);
                    console.log(`[tiktok-live] ${endpointLabel} quality["${q}"].flv: ${String(qualityObj.flv || 'MISSING').slice(0, 120)}`);
                    const urlList = qualityObj.url_list as string[];
                    if (Array.isArray(urlList) && urlList.length > 0) {
                      console.log(`[tiktok-live] ${endpointLabel} quality["${q}"].url_list[0]: ${String(urlList[0]).slice(0, 120)}`);
                    }
                  }
                }
              }

              // ── Helper: derive HLS URL from FLV URL (TikTok CDN pattern) ────
              const flvToHls = (flvUrl: string): string | undefined => {
                if (!flvUrl || !flvUrl.startsWith('http')) return undefined;
                // pull-flv-xxx.tiktokcdn*.com/.../stream-ID_hd.flv → pull-hls-xxx.tiktokcdn*.com/.../stream-ID_hd.m3u8
                const hls = flvUrl
                  .replace(/pull-flv/g, 'pull-hls')
                  .replace(/\.flv(\?|$)/, '.m3u8$1');
                console.log(`[tiktok-live] ${endpointLabel} Derived HLS from FLV: ${hls.slice(0, 120)}`);
                return hls;
              };

              // ── Probe all known TikTok HLS path variants ───────────────────
              const tryHls = (q: string): string | undefined => {
                const qObj = mainData[q] as Record<string, unknown> | undefined;
                if (!qObj) return undefined;

                // Pattern 1: quality.main.hls  (webcast endpoint - may be empty string)
                const mainStream = qObj.main as Record<string, unknown> | undefined;
                if (mainStream && typeof mainStream === 'object') {
                  const hlsVal = mainStream.hls as string | undefined;
                  const flvVal = mainStream.flv as string | undefined;
                  const cmafVal = mainStream.cmaf as string | undefined;

                  // HLS present and non-empty
                  if (hlsVal && hlsVal.startsWith('http')) return hlsVal;
                  // CMAF (sometimes contains m3u8)
                  if (cmafVal && cmafVal.startsWith('http')) return cmafVal;
                  // Derive HLS from FLV when HLS is empty
                  if (flvVal && flvVal.startsWith('http')) return flvToHls(flvVal);
                }

                // Pattern 2: quality.hls directly (some api-live responses)
                const directHls = qObj.hls as string | undefined;
                if (directHls && directHls.startsWith('http')) return directHls;

                // Pattern 3: quality.url_list — prefer .m3u8 urls
                const urlList = qObj.url_list as string[] | undefined;
                if (Array.isArray(urlList)) {
                  const m3u8 = urlList.find((u) => u.includes('.m3u8'));
                  if (m3u8) return m3u8;
                  if (urlList[0]) return urlList[0];
                }

                // Pattern 4: derive from direct flv on quality object
                const directFlv = qObj.flv as string | undefined;
                if (directFlv && directFlv.startsWith('http')) return flvToHls(directFlv);

                return undefined;
              };

              rawHlsUrl =
                tryHls('hd') ||
                tryHls('sd') ||
                tryHls('origin') ||
                tryHls('ld') ||
                tryHls('md') ||
                // Try any available quality as last resort
                qualities.map(tryHls).find(Boolean);

              console.log(`[tiktok-live] ${endpointLabel} Extracted HLS URL: ${rawHlsUrl ? rawHlsUrl.slice(0, 120) + '...' : 'NOT FOUND'}`);
            } else {
              console.warn(`[tiktok-live] ${endpointLabel} streamObj.data is null/undefined. streamObj keys: ${Object.keys(streamObj || {}).join(', ')}`);
            }
          } catch (e) {
            console.warn(`[tiktok-live] ${endpointLabel} Failed parsing stream_data JSON:`, e);
            debugLog.push({ endpoint: apiUrl, error: 'stream_data parse failed', detail: String(e) });
          }
        } else {
          console.warn(`[tiktok-live] ${endpointLabel} No streamData found in liveRoom — stream may be offline`);
        }

        if (isLive && rawHlsUrl) {
          const cleanHls = rawHlsUrl.replace(/[\\"\\s]+$/, '');
          const proxiedUrl = `/api/proxy-stream?url=${encodeURIComponent(cleanHls)}`;

          console.log(`[tiktok-live] SUCCESS — returning proxied HLS for @${username}`);
          return NextResponse.json({
            success: true,
            isLive: true,
            username,
            title,
            hlsUrl: proxiedUrl,
            directHlsUrl: cleanHls,
            viewerCount,
            coverUrl,
            ...(showDebug && { debug: debugLog }),
          });
        }

        console.log(`[tiktok-live] ${endpointLabel} OFFLINE — no HLS URL or not live`);
        return NextResponse.json({
          success: true,
          isLive: false,
          username,
          title,
          error: `@${username} is currently OFFLINE`,
          viewerCount,
          coverUrl,
          ...(showDebug && { debug: debugLog }),
        });
      } else {
        console.warn(`[tiktok-live] ${endpointLabel} liveRoom not found or no usable fields. JSON keys: ${Object.keys(json || {}).join(', ')}`);
        debugLog.push({ endpoint: apiUrl, httpStatus, warning: 'liveRoom not found', topLevelKeys: Object.keys(json || {}) });
      }
    } catch (endpointErr) {
      console.warn(`[tiktok-live] ${endpointLabel} FETCH ERROR:`, endpointErr);
      debugLog.push({ endpoint: apiUrl, fetchError: String(endpointErr) });
    }
  }

  console.error(`[tiktok-live] All endpoints exhausted for @${username}. Debug:`, JSON.stringify(debugLog));

  return NextResponse.json({
    success: false,
    isLive: false,
    username,
    error: `Could not retrieve live stream for @${username} (Stream may be offline or restricted)`,
    ...(showDebug && { debug: debugLog }),
  });
}
