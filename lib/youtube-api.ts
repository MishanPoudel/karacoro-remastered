/**
 * YouTube API Integration (Basic Version)
 */

export interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  channelTitle: string;
}

export interface YouTubeSearchResult {
  videos: YouTubeVideo[];
  nextPageToken?: string;
}

const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export async function searchVideos(
  query: string,
  maxResults: number = 10,
  pageToken?: string
): Promise<YouTubeSearchResult> {
  if (!API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    q: query,
    maxResults: maxResults.toString(),
    key: API_KEY,
  });

  if (pageToken) {
    params.append('pageToken', pageToken);
  }

  const response = await fetch(`${BASE_URL}/search?${params}`);
  
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();

  const videos: YouTubeVideo[] = data.items?.map((item: any) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    duration: 0, // Will need separate API call for duration
    channelTitle: item.snippet.channelTitle,
  })) || [];

  return {
    videos,
    nextPageToken: data.nextPageToken,
  };
}

export async function getVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
  if (!API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    id: videoId,
    key: API_KEY,
  });

  const response = await fetch(`${BASE_URL}/videos?${params}`);
  
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();
  const item = data.items?.[0];

  if (!item) {
    return null;
  }

  return {
    id: item.id,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
    duration: parseDuration(item.contentDetails.duration),
    channelTitle: item.snippet.channelTitle,
  };
}

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

function parseDuration(duration: string): number {
  // Parse ISO 8601 duration format (PT1H2M3S)
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
  if (!match) {
    return 0;
  }

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return hours * 3600 + minutes * 60 + seconds;
}