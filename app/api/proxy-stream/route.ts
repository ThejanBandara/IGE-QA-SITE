import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const cleanUrl = targetUrl.replace(/[\\"\s]+$/, '');
    const urlObj = new URL(cleanUrl);

    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://www.tiktok.com/',
        'Origin': 'https://www.tiktok.com',
      },
    });

    if (!response.ok) {
      return new NextResponse(`Upstream returned ${response.status}`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get('content-type') || 'application/vnd.apple.mpegurl';

    // If it is an m3u8 playlist, rewrite relative chunk URLs to proxy through this route
    if (cleanUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
      const text = await response.text();
      const baseUrl = cleanUrl.substring(0, cleanUrl.lastIndexOf('/') + 1);

      const modifiedPlaylist = text.split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          return line;
        }

        let fullChunkUrl: string;
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
          fullChunkUrl = trimmed;
        } else {
          fullChunkUrl = new URL(trimmed, baseUrl).toString();
        }

        return `/api/proxy-stream?url=${encodeURIComponent(fullChunkUrl)}`;
      }).join('\n');

      return new NextResponse(modifiedPlaylist, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Binary TS chunks or media data
    const arrayBuffer = await response.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err: unknown) {
    return new NextResponse(err instanceof Error ? err.message : 'Proxy fetch error', {
      status: 500,
    });
  }
}
