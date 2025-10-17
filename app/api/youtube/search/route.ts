import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/redis';

const CACHE_DURATION = 24 * 60 * 60; // 24 hours in seconds

// Rate limiting per IP
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // 10 requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const maxResults = parseInt(searchParams.get('maxResults') || '10');

  if (!query) {
    return NextResponse.json({ error: 'Query parameter required' }, { status: 400 });
  }

  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please try again in a minute.' },
      { status: 429 }
    );
  }

  // Check cache first
  const cacheKey = `search:${query}:${maxResults}`;
  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log(`✅ Cache HIT for: ${query}`);
    return NextResponse.json({ ...cached, cached: true });
  }

  console.log(`❌ Cache MISS for: ${query} - Making API call`);

  const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!API_KEY) {
    return NextResponse.json({ error: 'YouTube API not configured' }, { status: 500 });
  }

  try {
    // Single API call - get search results with snippet
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&` +
      `q=${encodeURIComponent(query + ' karaoke')}&` +
      `type=video&` +
      `videoCategoryId=10&` +
      `maxResults=${maxResults}&` +
      `key=${API_KEY}`;

    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('YouTube API search error:', errorText.substring(0, 200));
      throw new Error(`YouTube API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return NextResponse.json({ results: [], isMock: false });
    }

    // Get video IDs for duration lookup
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    
    // Second API call - get durations
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?` +
      `part=contentDetails&` +
      `id=${videoIds}&` +
      `key=${API_KEY}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    // Create a duration map
    const durationMap = new Map();
    detailsData.items?.forEach((item: any) => {
      durationMap.set(item.id, item.contentDetails.duration);
    });

    // Combine results
    const results = searchData.items.map((item: any) => {
      const duration = durationMap.get(item.id.videoId);
      return {
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle,
        duration: duration ? parseDuration(duration) : 0,
      };
    });

    const responseData = { results, isMock: false, cached: false };

    // Cache the results for 24 hours
    await cache.set(cacheKey, responseData, { ex: CACHE_DURATION });
    console.log(`💾 Cached results for: ${query}`);

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('YouTube API error:', error);
    return NextResponse.json(
      { error: 'Failed to search videos' },
      { status: 500 }
    );
  }
}

// Helper function to parse ISO 8601 duration
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}
