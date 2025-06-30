// YouTube Data API v3 integration
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY || '';
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeSearchResult {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: string;
  publishedAt: string;
  description: string;
}

export interface YouTubeVideoDetails {
  id: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: number; // in seconds
  publishedAt: string;
  description: string;
  viewCount: string;
  likeCount: string;
}

// Convert ISO 8601 duration to seconds
export const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1]?.replace('H', '') || '0');
  const minutes = parseInt(match[2]?.replace('M', '') || '0');
  const seconds = parseInt(match[3]?.replace('S', '') || '0');
  
  return hours * 3600 + minutes * 60 + seconds;
};

// Format seconds to MM:SS or HH:MM:SS
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Search YouTube videos
export const searchYouTubeVideos = async (
  query: string,
  maxResults: number = 10
): Promise<YouTubeSearchResult[]> => {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  try {
    const searchUrl = `${YOUTUBE_API_BASE_URL}/search?` +
      `part=snippet&` +
      `q=${encodeURIComponent(query)}&` +
      `type=video&` +
      `videoCategoryId=10&` + // Music category
      `maxResults=${maxResults}&` +
      `key=${YOUTUBE_API_KEY}`;

    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      throw new Error(`YouTube API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    // Get video IDs for duration lookup
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    
    // Get video details including duration
    const detailsUrl = `${YOUTUBE_API_BASE_URL}/videos?` +
      `part=contentDetails,statistics&` +
      `id=${videoIds}&` +
      `key=${YOUTUBE_API_KEY}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    // Combine search results with details
    const results: YouTubeSearchResult[] = searchData.items.map((item: any) => {
      const details = detailsData.items?.find((d: any) => d.id === item.id.videoId);
      const duration = details ? parseDuration(details.contentDetails.duration) : 0;

      return {
        id: item.id.videoId,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        duration: formatDuration(duration),
        publishedAt: item.snippet.publishedAt,
        description: item.snippet.description
      };
    });

    return results;
  } catch (error) {
    console.error('Error searching YouTube videos:', error);
    throw error;
  }
};

// Get video details by ID
export const getVideoDetails = async (videoId: string): Promise<YouTubeVideoDetails | null> => {
  if (!YOUTUBE_API_KEY) {
    throw new Error('YouTube API key not configured');
  }

  try {
    const url = `${YOUTUBE_API_BASE_URL}/videos?` +
      `part=snippet,contentDetails,statistics&` +
      `id=${videoId}&` +
      `key=${YOUTUBE_API_KEY}`;

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    const duration = parseDuration(item.contentDetails.duration);

    return {
      id: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
      duration,
      publishedAt: item.snippet.publishedAt,
      description: item.snippet.description,
      viewCount: item.statistics.viewCount || '0',
      likeCount: item.statistics.likeCount || '0'
    };
  } catch (error) {
    console.error('Error getting video details:', error);
    return null;
  }
};

// Extract video ID from YouTube URL
export const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

// Validate YouTube URL
export const isValidYouTubeUrl = (url: string): boolean => {
  return extractVideoId(url) !== null;
};

// Get video thumbnail URL
export const getVideoThumbnail = (videoId: string, quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium'): string => {
  return `https://img.youtube.com/vi/${videoId}/${quality === 'default' ? 'default' : quality === 'medium' ? 'mqdefault' : quality === 'high' ? 'hqdefault' : 'maxresdefault'}.jpg`;
};

// Get popular karaoke songs
export const getPopularKaraokeSongs = async (): Promise<YouTubeSearchResult[]> => {
  const karaokeQueries = [
    'karaoke songs popular',
    'best karaoke hits',
    'karaoke classics',
    'sing along songs',
    'karaoke party songs'
  ];

  try {
    const randomQuery = karaokeQueries[Math.floor(Math.random() * karaokeQueries.length)];
    return await searchYouTubeVideos(randomQuery, 20);
  } catch (error) {
    console.error('Error getting popular karaoke songs:', error);
    return [];
  }
};

// Check if video is embeddable
export const checkVideoEmbeddable = async (videoId: string): Promise<boolean> => {
  if (!YOUTUBE_API_KEY) {
    return true; // Assume embeddable if we can't check
  }

  try {
    const url = `${YOUTUBE_API_BASE_URL}/videos?` +
      `part=status&` +
      `id=${videoId}&` +
      `key=${YOUTUBE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.items && data.items.length > 0) {
      return data.items[0].status.embeddable !== false;
    }

    return true;
  } catch (error) {
    console.error('Error checking video embeddable status:', error);
    return true;
  }
};