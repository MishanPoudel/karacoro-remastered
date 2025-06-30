/**
 * YouTube API with Mock Fallback
 */

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

// Mock data for when API is not available
const MOCK_SEARCH_RESULTS: YouTubeSearchResult[] = [
  {
    id: 'dQw4w9WgXcQ',
    title: 'Rick Astley - Never Gonna Give You Up (Karaoke Version)',
    channelTitle: 'Sing King Karaoke',
    thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
    duration: '3:33',
    publishedAt: '2009-10-25T00:00:00Z',
    description: 'Classic 80s hit perfect for karaoke nights'
  },
  {
    id: 'kJQP7kiw5Fk',
    title: 'Luis Fonsi - Despacito ft. Daddy Yankee (Karaoke)',
    channelTitle: 'Latin Karaoke',
    thumbnail: 'https://img.youtube.com/vi/kJQP7kiw5Fk/mqdefault.jpg',
    duration: '3:47',
    publishedAt: '2017-01-12T00:00:00Z',
    description: 'Global hit that dominated charts worldwide'
  },
  {
    id: 'fJ9rUzIMcZQ',
    title: 'Queen - Bohemian Rhapsody (Karaoke Version)',
    channelTitle: 'Rock Karaoke Classics',
    thumbnail: 'https://img.youtube.com/vi/fJ9rUzIMcZQ/mqdefault.jpg',
    duration: '5:55',
    publishedAt: '1975-10-31T00:00:00Z',
    description: 'Epic rock opera masterpiece for brave singers'
  },
  {
    id: 'hTWKbfoikeg',
    title: 'Adele - Someone Like You (Karaoke)',
    channelTitle: 'Ballad Karaoke',
    thumbnail: 'https://img.youtube.com/vi/hTWKbfoikeg/mqdefault.jpg',
    duration: '4:45',
    publishedAt: '2011-01-24T00:00:00Z',
    description: 'Emotional ballad that showcases vocal range'
  },
  {
    id: 'JGwWNGJdvx8',
    title: 'Ed Sheeran - Shape of You (Karaoke)',
    channelTitle: 'Pop Karaoke Hits',
    thumbnail: 'https://img.youtube.com/vi/JGwWNGJdvx8/mqdefault.jpg',
    duration: '3:53',
    publishedAt: '2017-01-06T00:00:00Z',
    description: 'Catchy pop hit with irresistible rhythm'
  },
  {
    id: 'YQHsXMglC9A',
    title: 'Adele - Hello (Karaoke Version)',
    channelTitle: 'Vocal Challenge Karaoke',
    thumbnail: 'https://img.youtube.com/vi/YQHsXMglC9A/mqdefault.jpg',
    duration: '4:55',
    publishedAt: '2015-10-23T00:00:00Z',
    description: 'Powerful ballad for serious vocalists'
  },
  {
    id: 'CevxZvSJLk8',
    title: 'Katy Perry - Roar (Karaoke)',
    channelTitle: 'Empowerment Karaoke',
    thumbnail: 'https://img.youtube.com/vi/CevxZvSJLk8/mqdefault.jpg',
    duration: '3:43',
    publishedAt: '2013-08-10T00:00:00Z',
    description: 'Empowering anthem that builds confidence'
  },
  {
    id: 'nfWlot6h_JM',
    title: 'Taylor Swift - Shake It Off (Karaoke)',
    channelTitle: 'Pop Diva Karaoke',
    thumbnail: 'https://img.youtube.com/vi/nfWlot6h_JM/mqdefault.jpg',
    duration: '3:39',
    publishedAt: '2014-08-18T00:00:00Z',
    description: 'Upbeat pop anthem perfect for dancing'
  }
];

const MOCK_POPULAR_SONGS: YouTubeSearchResult[] = [
  {
    id: 'L_jWHffIx5E',
    title: 'The Weeknd - Blinding Lights (Karaoke)',
    channelTitle: 'Modern Hits Karaoke',
    thumbnail: 'https://img.youtube.com/vi/L_jWHffIx5E/mqdefault.jpg',
    duration: '3:20',
    publishedAt: '2019-11-29T00:00:00Z',
    description: 'Synthwave-inspired modern classic'
  },
  {
    id: 'gGdGFtwCNBE',
    title: 'The Beatles - Let It Be (Karaoke)',
    channelTitle: 'Classic Rock Karaoke',
    thumbnail: 'https://img.youtube.com/vi/gGdGFtwCNBE/mqdefault.jpg',
    duration: '4:03',
    publishedAt: '1970-03-06T00:00:00Z',
    description: 'Timeless Beatles masterpiece'
  },
  {
    id: 'tbU3zdAgiX8',
    title: 'Billie Eilish - bad guy (Karaoke)',
    channelTitle: 'Alternative Pop Karaoke',
    thumbnail: 'https://img.youtube.com/vi/tbU3zdAgiX8/mqdefault.jpg',
    duration: '3:14',
    publishedAt: '2019-03-29T00:00:00Z',
    description: 'Dark pop hit with unique vocal style'
  },
  {
    id: 'RBumgq5yVrA',
    title: 'Passenger - Let Her Go (Karaoke)',
    channelTitle: 'Indie Folk Karaoke',
    thumbnail: 'https://img.youtube.com/vi/RBumgq5yVrA/mqdefault.jpg',
    duration: '4:12',
    publishedAt: '2012-07-24T00:00:00Z',
    description: 'Heartfelt indie folk ballad'
  },
  {
    id: 'hLQl3WQQoQ0',
    title: 'Adele - Someone Like You (Karaoke)',
    channelTitle: 'Emotional Ballads Karaoke',
    thumbnail: 'https://img.youtube.com/vi/hLQl3WQQoQ0/mqdefault.jpg',
    duration: '4:45',
    publishedAt: '2011-01-24T00:00:00Z',
    description: 'Soul-stirring ballad for emotional moments'
  },
  {
    id: 'fRh_vgS2dFE',
    title: 'Justin Timberlake - Can\'t Stop the Feeling (Karaoke)',
    channelTitle: 'Feel Good Karaoke',
    thumbnail: 'https://img.youtube.com/vi/fRh_vgS2dFE/mqdefault.jpg',
    duration: '3:56',
    publishedAt: '2016-05-06T00:00:00Z',
    description: 'Uplifting pop song that spreads joy'
  },
  {
    id: 'ru0K8uYEZWw',
    title: 'ColdPlay - Fix You (Karaoke)',
    channelTitle: 'Alternative Rock Karaoke',
    thumbnail: 'https://img.youtube.com/vi/ru0K8uYEZWw/mqdefault.jpg',
    duration: '4:54',
    publishedAt: '2005-09-05T00:00:00Z',
    description: 'Emotional rock anthem with powerful build-up'
  },
  {
    id: 'QcIy9NiNbmo',
    title: 'Bruno Mars - Just The Way You Are (Karaoke)',
    channelTitle: 'Romantic Karaoke',
    thumbnail: 'https://img.youtube.com/vi/QcIy9NiNbmo/mqdefault.jpg',
    duration: '3:40',
    publishedAt: '2010-07-20T00:00:00Z',
    description: 'Sweet romantic ballad perfect for dedications'
  }
];

// Check if YouTube API is available and valid
const isYouTubeApiAvailable = (): boolean => {
  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  return !!(apiKey && apiKey.length > 10 && !apiKey.includes('your_'));
};

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

// Search YouTube videos with mock fallback
export const searchYouTubeVideos = async (
  query: string,
  maxResults: number = 10
): Promise<{ results: YouTubeSearchResult[]; isMock: boolean }> => {
  console.log(`Searching YouTube videos: "${query}" (max: ${maxResults})`);

  if (!isYouTubeApiAvailable()) {
    console.log('YouTube API not available, using mock data');
    
    // Filter mock results based on query
    const allMockResults = [...MOCK_SEARCH_RESULTS, ...MOCK_POPULAR_SONGS];
    const filteredResults = allMockResults.filter(video =>
      video.title.toLowerCase().includes(query.toLowerCase()) ||
      video.description.toLowerCase().includes(query.toLowerCase()) ||
      video.channelTitle.toLowerCase().includes(query.toLowerCase())
    );
    
    // If no matches, return random selection from all mock results
    const results = filteredResults.length > 0 ? filteredResults : allMockResults;
    
    // Shuffle and limit results
    const shuffled = results.sort(() => Math.random() - 0.5);
    
    return {
      results: shuffled.slice(0, maxResults),
      isMock: true
    };
  }

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?` +
      `part=snippet&` +
      `q=${encodeURIComponent(query + ' karaoke')}&` +
      `type=video&` +
      `videoCategoryId=10&` +
      `maxResults=${maxResults}&` +
      `key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`;

    const searchResponse = await fetch(searchUrl);
    
    if (!searchResponse.ok) {
      throw new Error(`YouTube API error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();
    
    if (!searchData || 
        !Array.isArray(searchData.items) || 
        searchData.items.length === 0) {
      return { results: [], isMock: false };
    }

    // Get video IDs for duration lookup
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');
    
    // Get video details including duration
    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?` +
      `part=contentDetails,statistics&` +
      `id=${videoIds}&` +
      `key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`;

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

    console.log(`Found ${results.length} YouTube videos`);
    return { results, isMock: false };

  } catch (error) {
    console.error('YouTube search failed:', error);
    console.log('Falling back to mock data');
    
    // Return filtered mock results as fallback
    const allMockResults = [...MOCK_SEARCH_RESULTS, ...MOCK_POPULAR_SONGS];
    const filteredResults = allMockResults.filter(video =>
      video.title.toLowerCase().includes(query.toLowerCase()) ||
      video.description.toLowerCase().includes(query.toLowerCase())
    );
    
    return {
      results: (filteredResults.length > 0 ? filteredResults : allMockResults).slice(0, maxResults),
      isMock: true
    };
  }
};

// Get video details by ID
export const getVideoDetails = async (videoId: string): Promise<YouTubeVideoDetails | null> => {
  console.log(`Getting video details for: ${videoId}`);

  if (!isYouTubeApiAvailable()) {
    // Return mock details for known video IDs
    const mockVideo = [...MOCK_SEARCH_RESULTS, ...MOCK_POPULAR_SONGS].find(v => v.id === videoId);
    if (mockVideo) {
      // Parse duration string (MM:SS or H:MM:SS) to seconds
      const durationParts = mockVideo.duration.split(':').map(Number);
      let durationInSeconds = 0;
      if (durationParts.length === 2) {
        // MM:SS format
        durationInSeconds = durationParts[0] * 60 + durationParts[1];
      } else if (durationParts.length === 3) {
        // H:MM:SS format
        durationInSeconds = durationParts[0] * 3600 + durationParts[1] * 60 + durationParts[2];
      }
      
      return {
        id: mockVideo.id,
        title: mockVideo.title,
        channelTitle: mockVideo.channelTitle,
        thumbnail: mockVideo.thumbnail,
        duration: durationInSeconds,
        publishedAt: mockVideo.publishedAt,
        description: mockVideo.description,
        viewCount: Math.floor(Math.random() * 10000000 + 1000000).toString(),
        likeCount: Math.floor(Math.random() * 100000 + 10000).toString()
      };
    }
    
    // Return generic mock for unknown videos
    return {
      id: videoId,
      title: 'Mock Karaoke Video',
      channelTitle: 'Mock Karaoke Channel',
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      duration: 180,
      publishedAt: new Date().toISOString(),
      description: 'This is a mock video for demonstration purposes',
      viewCount: '1000000',
      likeCount: '50000'
    };
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?` +
      `part=snippet,contentDetails,statistics&` +
      `id=${videoId}&` +
      `key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`;

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

// Get popular karaoke songs with mock fallback
export const getPopularKaraokeSongs = async (): Promise<{ results: YouTubeSearchResult[]; isMock: boolean }> => {
  console.log('Getting popular karaoke songs');

  if (!isYouTubeApiAvailable()) {
    console.log('YouTube API not available, using mock popular songs');
    // Shuffle the popular songs for variety
    const shuffled = [...MOCK_POPULAR_SONGS].sort(() => Math.random() - 0.5);
    return {
      results: shuffled,
      isMock: true
    };
  }

  const karaokeQueries = [
    'popular karaoke songs 2024',
    'best karaoke hits all time',
    'karaoke classics everyone knows',
    'top karaoke party songs'
  ];

  try {
    const randomQuery = karaokeQueries[Math.floor(Math.random() * karaokeQueries.length)];
    const searchResult = await searchYouTubeVideos(randomQuery, 20);
    return searchResult;
  } catch (error) {
    console.error('Error getting popular karaoke songs:', error);
    return {
      results: MOCK_POPULAR_SONGS,
      isMock: true
    };
  }
};

// Check if video is embeddable
export const checkVideoEmbeddable = async (videoId: string): Promise<boolean> => {
  if (!isYouTubeApiAvailable()) {
    return true; // Assume embeddable for mock videos
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?` +
      `part=status&` +
      `id=${videoId}&` +
      `key=${process.env.NEXT_PUBLIC_YOUTUBE_API_KEY}`;

    const response = await fetch(url);

    if (response.ok) {
      const data = await response.json();
      if (data.items && data.items.length > 0) {
        return data.items[0].status.embeddable !== false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking video embeddable status:', error);
    return true;
  }
};