import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const cleanUrl = targetUrl.replace(/[\\"\\s]+$/, '');
    console.log(`[proxy-stream] Proxying URL: ${cleanUrl.slice(0, 150)}`);

    const response = await fetch(cleanUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': 'https://www.tiktok.com/',
        'Origin': 'https://www.tiktok.com',
      },
    });

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    console.log(`[proxy-stream] Upstream HTTP ${response.status}, Content-Type: ${contentType}`);

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[proxy-stream] Upstream ERROR ${response.status} for URL: ${cleanUrl.slice(0, 150)}`);
      console.error(`[proxy-stream] Upstream error body: ${body.slice(0, 300)}`);
      return new NextResponse(`Upstream returned ${response.status}: ${body.slice(0, 200)}`, {
        status: response.status,
      });
    }

    // If it is an m3u8 playlist, rewrite relative chunk URLs to proxy through this route
    if (cleanUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
      const text = await response.text();
      const baseUrl = cleanUrl.substring(0, cleanUrl.lastIndexOf('/') + 1);
      const lineCount = text.split('\n').length;
      console.log(`[proxy-stream] m3u8 playlist received — ${lineCount} lines, base: ${baseUrl.slice(0, 100)}`);

      const modifiedPlaylist = text
        .split('\n')
        .map((line) => {
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
        })
        .join('\n');

      return new NextResponse(modifiedPlaylist, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // Pass through video chunks directly with streaming body
    console.log(`[proxy-stream] Streaming binary chunk for: ${cleanUrl.slice(0, 80)}...`);
    return new NextResponse(response.body, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[proxy-stream] FETCH EXCEPTION: ${message}`, err);
    return new NextResponse(`Proxy fetch error: ${message}`, {
      status: 500,
    });
  }
}
