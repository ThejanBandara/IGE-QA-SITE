/**
 * Cloudflare Worker — TikTok Live Stream Proxy
 *
 * Deploy this to Cloudflare Workers (free tier) to proxy TikTok CDN content.
 * Cloudflare's edge IPs are NOT blocked by TikTok CDN, unlike AWS/Vercel IPs.
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to https://dash.cloudflare.com and sign up (free)
 * 2. Click "Workers & Pages" → "Create Worker"
 * 3. Replace the default code with this file content
 * 4. Click "Deploy"
 * 5. Your worker URL will be: https://your-worker-name.your-subdomain.workers.dev
 * 6. In Vercel → your project → Settings → Environment Variables, add:
 *    Name: TIKTOK_PROXY_BASE
 *    Value: https://your-worker-name.your-subdomain.workers.dev
 * 7. Redeploy on Vercel
 */

const ALLOWED_ORIGINS = ['ige-qa.vercel.app', 'localhost:3000'];

const TIKTOK_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://www.tiktok.com/',
  'Origin': 'https://www.tiktok.com',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-site',
};

export default {
  async fetch(request, env, ctx) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new Response('Missing url parameter', { status: 400 });
    }

    // Security: only allow TikTok CDN URLs
    let parsedTarget;
    try {
      parsedTarget = new URL(targetUrl);
    } catch {
      return new Response('Invalid URL', { status: 400 });
    }

    const allowedHosts = ['tiktokcdn.com', 'tiktokcdn-us.com', 'tiktokv.com'];
    const isAllowed = allowedHosts.some((h) => parsedTarget.hostname.endsWith(h));
    if (!isAllowed) {
      return new Response('URL not allowed', { status: 403 });
    }

    try {
      const upstream = await fetch(targetUrl, {
        headers: TIKTOK_HEADERS,
        cf: {
          // Cache CDN content at the edge for short duration
          cacheTtl: 30,
          cacheEverything: false,
        },
      });

      const contentType =
        upstream.headers.get('content-type') || 'application/octet-stream';

      // For m3u8 playlists: rewrite chunk URLs to go through this worker
      if (targetUrl.includes('.m3u8') || contentType.includes('mpegurl')) {
        const text = await upstream.text();
        const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);

        const rewrittenPlaylist = text
          .split('\n')
          .map((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return line;

            let fullChunkUrl;
            if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
              fullChunkUrl = trimmed;
            } else {
              fullChunkUrl = new URL(trimmed, baseUrl).toString();
            }

            return `${url.origin}?url=${encodeURIComponent(fullChunkUrl)}`;
          })
          .join('\n');

        return new Response(rewrittenPlaylist, {
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        });
      }

      // Stream binary chunks through
      return new Response(upstream.body, {
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=30',
        },
      });
    } catch (err) {
      return new Response(`Worker proxy error: ${err.message}`, { status: 500 });
    }
  },
};
