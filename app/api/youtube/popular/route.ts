import { NextRequest, NextResponse } from 'next/server';
import { cache } from '@/lib/redis';

const CACHE_DURATION = 24 * 60 * 60; // 24 hours in seconds

const POPULAR_KARAOKE_QUERIES = [
  'karaoke hits 2024',
  'best karaoke songs',
  'popular karaoke classics',
];

// Mock data fallback when YouTube API is unavailable
const MOCK_POPULAR_SONGS = [
  {
    id: 'CvBfHwUxHIk',
    title: 'Bohemian Rhapsody - Queen (Karaoke Version)',
    description: 'Classic rock karaoke',
    thumbnail: 'https://i.ytimg.com/vi/CvBfHwUxHIk/mqdefault.jpg',
    channelTitle: 'Karaoke Songs',
    duration: 354,
  },
  {
    id: '60ItHLz5WEA',
    title: 'Don\'t Stop Believin\' - Journey (Karaoke)',
    description: 'Rock anthem karaoke',
    thumbnail: 'https://i.ytimg.com/vi/60ItHLz5WEA/mqdefault.jpg',
    channelTitle: 'Karaoke Hits',
    duration: 251,
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Despacito - Luis Fonsi (Karaoke Version)',
    description: 'Latin pop karaoke',
    thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/mqdefault.jpg',
    channelTitle: 'Karaoke Library',
    duration: 229,
  },
  {
    id: '2Vv-BfVoq4g',
    title: 'Perfect - Ed Sheeran (Karaoke)',
    description: 'Pop ballad karaoke',
    thumbnail: 'https://i.ytimg.com/vi/2Vv-BfVoq4g/mqdefault.jpg',
    channelTitle: 'Karaoke Central',
    duration: 263,
  },
  {
    id: 'RgKAFK5djSk',
    title: 'Shallow - Lady Gaga & Bradley Cooper (Karaoke)',
    description: 'Movie soundtrack karaoke',
    thumbnail: 'https://i.ytimg.com/vi/RgKAFK5djSk/mqdefault.jpg',
    channelTitle: 'Karaoke Now',
    duration: 216,
  },
];

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    const cacheKey = 'popular_songs';
    let cached = null;
    
    try {
      cached = await cache.get(cacheKey);
    } catch (cacheError) {
      console.warn('⚠️ Cache retrieval error, proceeding without cache:', cacheError);
    }
    
    if (cached) {
      console.log('✅ Popular songs served from cache');
      return NextResponse.json({ ...cached, cached: true });
    }

    console.log('❌ Popular songs cache MISS - fetching from API');

    const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    if (!API_KEY) {
      console.error('YouTube API key not configured');
      return NextResponse.json({ error: 'YouTube API not configured' }, { status: 500 });
    }

    console.log('🔑 YouTube API key found, making request...');
    // Use a random query to get variety
    const randomQuery = POPULAR_KARAOKE_QUERIES[Math.floor(Math.random() * POPULAR_KARAOKE_QUERIES.length)];
    
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&` +
      `q=${encodeURIComponent(randomQuery)}&` +
      `type=video&` +
      `videoCategoryId=10&` +
      `maxResults=20&` +
      `order=viewCount&` +
      `key=${API_KEY}`;

    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error('YouTube API error response:', errorText);
      throw new Error(`YouTube API error: ${searchResponse.status} - ${errorText.substring(0, 200)}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?` +
      `part=contentDetails&` +
      `id=${videoIds}&` +
      `key=${API_KEY}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    const durationMap = new Map();
    detailsData.items?.forEach((item: any) => {
      durationMap.set(item.id, item.contentDetails.duration);
    });

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

    const responseData = { results, cached: false };

    // Cache the results for 24 hours
    try {
      await cache.set(cacheKey, responseData, { ex: CACHE_DURATION });
      console.log('💾 Popular songs cached successfully');
    } catch (cacheError) {
      console.warn('⚠️ Failed to cache results, but continuing:', cacheError);
    }

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('YouTube API error:', error);
    console.log('⚠️ Falling back to mock popular songs data');
    
    // Return mock data as fallback
    const fallbackData = { 
      results: MOCK_POPULAR_SONGS, 
      cached: false,
      mock: true,
      error: 'YouTube API unavailable - using fallback data'
    };
    
    return NextResponse.json(fallbackData);
  }
}

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
}
