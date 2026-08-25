import { PlatformType } from '@/types/stream';

export interface ParsedStreamInfo {
  platform: PlatformType;
  embedUrl: string;
  originalUrl: string;
  isValid: boolean;
  streamType?: 'iframe' | 'hls';
  hlsUrl?: string;
  tiktokUsername?: string;
  warning?: string;
  error?: string;
}

/**
 * Extracts iframe src if user pasted a raw <iframe> code snippet
 */
function sanitizeRawInput(input: string): string {
  let cleaned = input.trim();
  if (cleaned.startsWith('<iframe') || cleaned.includes('src=')) {
    const srcMatch = cleaned.match(/src=["']([^"']+)["']/i);
    if (srcMatch) {
      cleaned = srcMatch[1];
    }
  }
  return cleaned;
}

/**
 * Extracts YouTube Video ID or Live ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const trimmed = sanitizeRawInput(url);
    if (!trimmed) return null;

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const hostname = urlObj.hostname.replace('www.', '');

    if (hostname === 'youtu.be') {
      return urlObj.pathname.slice(1).split('?')[0];
    }

    if (hostname.includes('youtube.com')) {
      if (urlObj.pathname.startsWith('/live/')) {
        return urlObj.pathname.replace('/live/', '').split('?')[0];
      }
      if (urlObj.pathname.startsWith('/embed/')) {
        return urlObj.pathname.replace('/embed/', '').split('?')[0];
      }
      if (urlObj.pathname.startsWith('/watch')) {
        return urlObj.searchParams.get('v');
      }
      if (urlObj.pathname.startsWith('/shorts/')) {
        return urlObj.pathname.replace('/shorts/', '').split('?')[0];
      }
    }

    return null;
  } catch {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|live\/))([\w-]{11})/);
    return match ? match[1] : null;
  }
}

/**
 * Extracts Facebook Video ID from various URL formats
 */
export function extractFacebookVideoId(url: string): string | null {
  try {
    const trimmed = sanitizeRawInput(url);
    if (!trimmed) return null;

    // Direct numeric ID
    if (/^\d{8,25}$/.test(trimmed)) {
      return trimmed;
    }

    // Check query params ?v=123 or &v=123
    const vParamMatch = trimmed.match(/[?&]v=(\d+)/i);
    if (vParamMatch) {
      return vParamMatch[1];
    }

    // Check /videos/12345 or /videos/vb.123/12345
    const videoPathMatch = trimmed.match(/\/videos\/(?:[a-zA-Z0-9_.-]+\/)?(\d+)/i);
    if (videoPathMatch) {
      return videoPathMatch[1];
    }

    // Check /reel/12345
    const reelMatch = trimmed.match(/\/reel\/(\d+)/i);
    if (reelMatch) {
      return reelMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse any social video or live link into a safe, autoplayable embed URL or HLS stream
 */
export function parseStreamUrl(url: string): ParsedStreamInfo {
  let trimmed = sanitizeRawInput(url);
  if (!trimmed) {
    return {
      platform: 'custom',
      embedUrl: '',
      originalUrl: '',
      isValid: false,
      error: 'URL is empty',
    };
  }

  // 1. Check Direct HLS (.m3u8) Streams
  if (trimmed.includes('.m3u8')) {
    return {
      platform: 'hls',
      embedUrl: '',
      hlsUrl: trimmed,
      streamType: 'hls',
      originalUrl: trimmed,
      isValid: true,
    };
  }

  // 2. Check YouTube
  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&playsinline=1&enablejsapi=1&rel=0`,
      streamType: 'iframe',
      originalUrl: trimmed,
      isValid: true,
    };
  }

  // 3. Check TikTok
  if (
    trimmed.includes('tiktok.com') ||
    trimmed.startsWith('@')
  ) {
    const videoMatch = trimmed.match(/tiktok\.com\/@[^/]+\/video\/(\d+)/i);
    if (videoMatch) {
      const videoId = videoMatch[1];
      return {
        platform: 'tiktok',
        embedUrl: `https://www.tiktok.com/embed/v2/${videoId}`,
        streamType: 'iframe',
        originalUrl: trimmed,
        isValid: true,
      };
    }

    let username = trimmed;
    const userMatch = trimmed.match(/tiktok\.com\/@([^/?#]+)/i);
    if (userMatch) {
      username = userMatch[1];
    } else {
      username = username.replace(/^@/, '').split('/')[0];
    }

    return {
      platform: 'tiktok',
      embedUrl: '',
      tiktokUsername: username,
      streamType: 'hls',
      originalUrl: trimmed.startsWith('http') ? trimmed : `https://www.tiktok.com/@${username}/live`,
      isValid: true,
    };
  }

  // 4. Check Facebook
  if (
    trimmed.includes('facebook.com') ||
    trimmed.includes('fb.watch') ||
    trimmed.includes('fb.com')
  ) {
    const fullUrl = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

    // If user already pasted Facebook's video.php embed plugin URL
    if (fullUrl.includes('plugins/video.php')) {
      let embedUrl = fullUrl;
      if (!embedUrl.includes('autoplay=')) {
        embedUrl += '&autoplay=true';
      }
      if (!embedUrl.includes('mute=')) {
        embedUrl += '&mute=1';
      }
      if (!embedUrl.includes('show_text=')) {
        embedUrl += '&show_text=0';
      }
      return {
        platform: 'facebook',
        embedUrl,
        streamType: 'iframe',
        originalUrl: fullUrl,
        isValid: true,
      };
    }

    // Try extracting numeric video ID
    const fbVideoId = extractFacebookVideoId(fullUrl);
    if (fbVideoId) {
      const canonicalWatchUrl = `https://www.facebook.com/watch/?v=${fbVideoId}`;
      const fbEmbedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        canonicalWatchUrl
      )}&show_text=0&autoplay=true&mute=1&controls=1`;

      return {
        platform: 'facebook',
        embedUrl: fbEmbedUrl,
        streamType: 'iframe',
        originalUrl: fullUrl,
        isValid: true,
      };
    }

    // Generic Facebook Live or page URL
    let normalizedFbUrl = fullUrl;
    if (normalizedFbUrl.includes('/watch/live/')) {
      normalizedFbUrl = normalizedFbUrl.replace('/watch/live/', '/watch/');
    }

    const fbEmbedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
      normalizedFbUrl
    )}&show_text=0&autoplay=true&mute=1&controls=1`;

    const isGenericLive = fullUrl.endsWith('/live') || fullUrl.endsWith('/live/');

    return {
      platform: 'facebook',
      embedUrl: fbEmbedUrl,
      streamType: 'iframe',
      originalUrl: fullUrl,
      isValid: true,
      warning: isGenericLive
        ? 'Note: For best results on Facebook Live, click "Share" -> "Copy Link" on the active broadcast to get the direct Video ID link.'
        : undefined,
    };
  }

  // 5. Fallback for custom or direct embed link
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return {
      platform: 'custom',
      embedUrl: trimmed,
      streamType: 'iframe',
      originalUrl: trimmed,
      isValid: true,
    };
  }

  return {
    platform: 'custom',
    embedUrl: trimmed,
    originalUrl: trimmed,
    isValid: false,
    error: 'Please provide a valid YouTube, Facebook, TikTok, or HLS stream URL',
  };
}

export const DEMO_STREAMS = [
  {
    title: 'NASA Live: Earth View',
    url: 'https://www.youtube.com/watch?v=awQzjn72bI0',
    platform: 'youtube' as PlatformType,
  },
  {
    title: 'Facebook Live / Video Feed',
    url: 'https://www.facebook.com/watch/?v=331246079661431',
    platform: 'facebook' as PlatformType,
  },
  {
    title: 'TikTok Live Feed (@aljazeeraenglish)',
    url: 'https://www.tiktok.com/@aljazeeraenglish/live',
    platform: 'tiktok' as PlatformType,
  },
  {
    title: 'Sky News Live Broadcast',
    url: 'https://www.youtube.com/watch?v=YDvsBbKfLPA',
    platform: 'youtube' as PlatformType,
  },
  {
    title: 'ABC News Live Feed',
    url: 'https://www.youtube.com/watch?v=iipR5yUp36o',
    platform: 'youtube' as PlatformType,
  },
  {
    title: 'Al Jazeera English Live',
    url: 'https://www.youtube.com/watch?v=gCNeDWCI0vo',
    platform: 'youtube' as PlatformType,
  },
];
