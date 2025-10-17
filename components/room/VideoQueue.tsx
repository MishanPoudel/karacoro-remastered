"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Trash2, Clock, User, ExternalLink, Eye, Loader2, Music, PlayCircle, ListMusic, AlertTriangle } from 'lucide-react';
import { QueueItem } from '@/hooks/useSocket';
import { 
  searchYouTubeVideos, 
  getVideoDetails, 
  extractVideoId, 
  isValidYouTubeUrl,
  getVideoThumbnail,
  checkVideoEmbeddable,
  getPopularKaraokeSongs,
  YouTubeSearchResult,
} from '@/lib/youtube-api-enhanced';
import { toast } from 'sonner';
import Image from 'next/image';

interface VideoQueueProps {
  queue: QueueItem[];
  isHost: boolean;
  onAddToQueue: (videoUrl: string, title: string, duration: number, thumbnail: string) => void;
  onRemoveFromQueue: (videoId: number) => void;
}

export function VideoQueue({ queue, isHost, onAddToQueue, onRemoveFromQueue }: VideoQueueProps) {
  const [videoUrl, setVideoUrl] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<YouTubeSearchResult[]>([]);
  const [popularSongs, setPopularSongs] = useState<YouTubeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [addingVideoId, setAddingVideoId] = useState<string | null>(null);
  const [isSearchMock, setIsSearchMock] = useState(false);
  const [isPopularMock, setIsPopularMock] = useState(false);

  // Load popular karaoke songs on component mount
  useEffect(() => {
    const loadPopularSongs = async () => {
      setIsLoadingPopular(true);
      try {
        // Use server-side cached API route
        const response = await fetch('/api/youtube/popular');
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('API error:', errorData);
          throw new Error(errorData.error || `HTTP ${response.status}: Failed to load popular songs`);
        }

        const data = await response.json();
        
        if (!data.results || !Array.isArray(data.results)) {
          throw new Error('Invalid response format from API');
        }
        
        // Exclude videos from or mentioning "sing king" to avoid low-quality uploads
        const filtered = data.results.filter((v: any) => {
          const title = (v.title || '').toLowerCase();
          const channel = (v.channelTitle || '').toLowerCase();
          return !title.includes('sing king') && !channel.includes('sing king');
        });
        
        setPopularSongs(filtered);
        setIsPopularMock(data.mock || false);
        
        if (data.mock) {
          console.log('⚠️ Using mock popular songs (YouTube API unavailable)');
          toast.info('Using sample songs - YouTube API unavailable');
        } else if (data.cached) {
          console.log('✅ Popular songs loaded from cache');
        } else {
          console.log('🎵 Popular songs loaded fresh (cached for 24h)');
        }
      } catch (error) {
        console.error('Error loading popular songs:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to load popular songs';
        toast.error(errorMessage);
      } finally {
        setIsLoadingPopular(false);
      }
    };

    loadPopularSongs();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // no-op: explicit search only (no debouncer to cancel)
    };
  }, []);

  const handleAddByUrl = async () => {
    if (!videoUrl.trim()) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    if (!isValidYouTubeUrl(videoUrl)) {
      toast.error('Please enter a valid YouTube URL');
      return;
    }

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      toast.error('Could not extract video ID from URL');
      return;
    }

    setIsAdding(true);
    try {
      // Check if video is embeddable
      const isEmbeddable = await checkVideoEmbeddable(videoId);
      if (!isEmbeddable) {
        toast.error('This video cannot be embedded and played');
        return;
      }

      // Get video details
      const videoDetails = await getVideoDetails(videoId);
      if (!videoDetails) {
        toast.error('Could not fetch video details');
        return;
      }

      // Check if video is too long (optional limit)
      if (videoDetails.duration > 600) { // 10 minutes
        toast.warning('Video is longer than 10 minutes - consider shorter songs for karaoke');
      }

      const thumbnail = getVideoThumbnail(videoId, 'medium');
      onAddToQueue(videoUrl, videoDetails.title, videoDetails.duration, thumbnail);
      setVideoUrl('');
      
      toast.success(`Added "${videoDetails.title}" to queue!`);
      
    } catch (error) {
      console.error('Error adding video:', error);
      toast.error('Failed to add video. Please check the URL and try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setIsSearching(true);
    try {
      // Use server-side API route with caching
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(searchQuery)}&maxResults=15`);
      
      if (response.status === 429) {
        toast.error('Too many requests. Please wait a minute and try again.');
        setIsSearching(false);
        return;
      }

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      
      // Filter out results from the "sing king" channel
      const filteredResults = data.results.filter(
        (video: any) => video.channelTitle.toLowerCase() !== 'sing king'
      );
      
      setSearchResults(filteredResults);
      setIsSearchMock(data.isMock || false);
      
      if (data.isMock) {
        toast.info('Using mock search results - YouTube API not configured', {
          description: 'Configure your YouTube API key for real search results'
        });
      } else if (filteredResults.length === 0) {
        toast.info('No videos found for your search');
      } else {
        if (data.cached) {
          toast.success(`Found ${filteredResults.length} videos (from cache)`);
        } else {
          toast.success(`Found ${filteredResults.length} videos`);
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Explicit search only — user triggers with Enter or Search button

  const handleAddFromSearch = async (video: YouTubeSearchResult) => {
    setAddingVideoId(video.id);
    try {
      // Check embeddable status via API
      const isEmbeddable = await checkVideoEmbeddable(video.id);
      if (!isEmbeddable) {
        toast.error('This video cannot be embedded and played');
        return;
      }

      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;

      // Prefer thumbnail from search result but fall back to details
      const videoDetails = await getVideoDetails(video.id);
      const duration = videoDetails?.duration || 0;
      const thumbnail = video.thumbnail || videoDetails?.thumbnail || getVideoThumbnail(video.id, 'medium');

      onAddToQueue(videoUrl, video.title, duration, thumbnail);
      toast.success(`Added "${video.title}" to queue!`);
    } catch (error) {
      console.error('Error adding video from search:', error);
      toast.error('Failed to add video');
    } finally {
      setAddingVideoId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: 'search' | 'url') => {
    if (e.key === 'Enter') {
      if (action === 'search') {
        handleSearch();
      } else {
        handleAddByUrl();
      }
    }
  };

  // Explicit search only — update query, clear results for short queries
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim().length < 1) {
      setSearchResults([]);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds === 0) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const openVideoInNewTab = (videoId: string) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-gradient-to-br from-red-500/30 to-red-600/20 rounded-lg shadow-lg shadow-red-500/20">
            <ListMusic className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Video Queue
            </h2>
            <p className="text-sm sm:text-base text-gray-400 hidden sm:block">Add songs and manage the karaoke queue</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-400 border border-red-500/30 px-2 sm:px-3 py-1 text-sm shadow-lg shadow-red-500/10">
          {queue.length} in queue
        </Badge>
      </div>

      {/* Main Queue Interface */}
      <Card className="bg-gray-800/50 backdrop-blur-xl border-red-500/30 shadow-2xl shadow-red-500/10 overflow-hidden">
        <Tabs defaultValue="add" className="w-full">
          <div className="border-b border-gray-700 bg-gradient-to-r from-gray-900/80 via-gray-900/70 to-gray-900/80 overflow-hidden">
            <TabsList className="grid w-full grid-cols-3 bg-transparent border-none h-12 sm:h-14 overflow-hidden">
              <TabsTrigger 
                value="add" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500/20 data-[state=active]:to-red-600/20 data-[state=active]:text-red-400 data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none border-b-2 border-transparent transition-all text-xs sm:text-sm overflow-hidden hover:bg-gray-800/50"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Add Songs</span>
                <span className="sm:hidden truncate">Add</span>
              </TabsTrigger>
              <TabsTrigger 
                value="popular"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500/20 data-[state=active]:to-red-600/20 data-[state=active]:text-red-400 data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none border-b-2 border-transparent transition-all text-xs sm:text-sm overflow-hidden hover:bg-gray-800/50"
              >
                <Music className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Popular</span>
                <span className="sm:hidden truncate">Top</span>
                {isPopularMock && (
                  <Badge variant="secondary" className="ml-1 text-xs bg-yellow-500/20 text-yellow-400 hidden sm:inline-flex flex-shrink-0">
                    MOCK
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="queue"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500/20 data-[state=active]:to-red-600/20 data-[state=active]:text-red-400 data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none border-b-2 border-transparent transition-all text-xs sm:text-sm overflow-hidden hover:bg-gray-800/50"
              >
                <PlayCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline truncate">Queue ({queue.length})</span>
                <span className="sm:hidden truncate">Q ({queue.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 sm:p-6 overflow-hidden">
            <TabsContent value="add" className="space-y-4 sm:space-y-6 mt-0">
              {/* Add by URL Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Add by YouTube URL
                  </h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Input
                    placeholder="Paste YouTube URL here..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="flex-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 h-10 sm:h-12 text-sm sm:text-base rounded-xl transition-all"
                    onKeyPress={(e) => handleKeyPress(e, 'url')}
                    disabled={isAdding}
                  />
                  <Button
                    onClick={handleAddByUrl}
                    disabled={isAdding || !videoUrl.trim()}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30 px-4 sm:px-6 h-10 sm:h-12 text-sm sm:text-base w-full sm:w-auto transition-all hover:scale-105"
                  >
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1 sm:mr-0" />
                        <span className="sm:hidden">Add Video</span>
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-400">
                  Supports youtube.com and youtu.be URLs. Non-embeddable videos will be automatically filtered out.
                </p>
              </div>

              {/* Search Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 sm:mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Search YouTube
                    </h3>
                  </div>
                  {isSearchMock && (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs self-start sm:self-auto">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      MOCK DATA
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Input
                    placeholder="Search for karaoke songs..."
                    value={searchQuery}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    className="flex-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 h-10 sm:h-12 text-sm sm:text-base rounded-xl transition-all"
                    onKeyPress={(e) => handleKeyPress(e, 'search')}
                    disabled={isSearching}
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30 px-4 sm:px-6 h-10 sm:h-12 text-sm sm:text-base w-full sm:w-auto transition-all hover:scale-105"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Search className="w-4 h-4 mr-1 sm:mr-0" />
                        <span className="sm:hidden">Search</span>
                      </>
                    )}
                  </Button>
                </div>

                {isSearchMock && (
                  <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-300 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">Mock Search Results</span>
                    </div>
                    <p className="text-yellow-200 text-xs mt-1">
                      Configure your YouTube API key in environment variables for real search results
                    </p>
                  </div>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-base sm:text-lg font-semibold text-white">
                        Search Results {isSearchMock ? '(Mock Data)' : '(Live Results)'}
                      </h4>
                    </div>
                    <div className="max-h-64 sm:max-h-80 overflow-y-auto border border-gray-700/50 rounded-lg scrollbar-hide">
                      <div className="space-y-2 sm:space-y-3 p-2 sm:p-4">
                        {searchResults.map((video) => (
                          <div
                            key={video.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-lg hover:from-gray-700/50 hover:to-gray-800/50 transition-all group border border-gray-600/30 hover:border-red-500/30"
                          >
                            <Image 
                              src={video.thumbnail} 
                              alt={video.title} 
                              width={96} 
                              height={72} 
                              className="w-full sm:w-20 md:w-24 h-auto sm:h-15 md:h-18 object-cover rounded-md flex-shrink-0" 
                              style={{ width: 'auto', height: 'auto' }}
                            />
                            <div className="flex-1 min-w-0 w-full sm:w-auto">
                              <h4 className="text-sm font-medium text-white group-hover:text-red-400 transition-colors line-clamp-2">
                                {video.title}
                              </h4>
                              <p className="text-xs text-gray-400 truncate mt-1">
                                {video.channelTitle}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                                <Badge variant="secondary" className="text-xs bg-gray-600 text-gray-300">
                                  {video.duration}
                                </Badge>
                                {isSearchMock && (
                                  <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-400">
                                    Mock
                                  </Badge>
                                )}
                                <button
                                  onClick={() => openVideoInNewTab(video.id)}
                                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Preview
                                </button>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleAddFromSearch(video)}
                              size="sm"
                              disabled={addingVideoId === video.id}
                              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/20 flex-shrink-0 w-full sm:w-auto transition-all hover:scale-105"
                            >
                              {addingVideoId === video.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-4 h-4 mr-1 sm:mr-0" />
                                  <span className="sm:hidden">Add to Queue</span>
                                </>
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="popular" className="mt-0">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      Popular Karaoke Songs
                    </h3>
                  </div>
                  {isPopularMock && (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs self-start sm:self-auto">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      MOCK DATA
                    </Badge>
                  )}
                </div>

                {isPopularMock && (
                  <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-yellow-300 text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium">Mock Popular Songs</span>
                    </div>
                    <p className="text-yellow-200 text-xs mt-1">
                      Configure your YouTube API key in environment variables for real popular songs
                    </p>
                  </div>
                )}
                
                {isLoadingPopular ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto mb-3" />
                      <span className="text-gray-400">Loading popular songs...</span>
                    </div>
                  </div>
                ) : popularSongs.length > 0 ? (
                  <div className="max-h-64 sm:max-h-96 overflow-y-auto border border-gray-700/50 rounded-lg scrollbar-hide">
                    <div className="space-y-2 sm:space-y-3 p-2 sm:p-4">
                      {popularSongs.map((video) => (
                        <div
                          key={video.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-lg hover:from-gray-700/50 hover:to-gray-800/50 transition-all group border border-gray-600/30 hover:border-red-500/30"
                        >
                          <Image 
                            src={video.thumbnail} 
                            alt={video.title} 
                            width={96} 
                            height={72} 
                            className="w-full sm:w-20 md:w-24 h-auto sm:h-15 md:h-18 object-cover rounded-md flex-shrink-0" 
                            style={{ width: 'auto', height: 'auto' }}
                          />
                          <div className="flex-1 min-w-0 w-full sm:w-auto">
                            <h4 className="text-sm font-medium text-white group-hover:text-red-400 transition-colors line-clamp-2">
                              {video.title}
                            </h4>
                            <p className="text-xs text-gray-400 truncate mt-1">
                              {video.channelTitle}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2">
                              <Badge variant="secondary" className="text-xs bg-gray-600 text-gray-300">
                                {video.duration}
                              </Badge>
                              {isPopularMock && (
                                <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-400">
                                  Mock
                                </Badge>
                              )}
                              <button
                                onClick={() => openVideoInNewTab(video.id)}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Preview
                              </button>
                            </div>
                          </div>
                          <Button
                            onClick={() => handleAddFromSearch(video)}
                            size="sm"
                            disabled={addingVideoId === video.id}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/20 flex-shrink-0 w-full sm:w-auto transition-all hover:scale-105"
                          >
                            {addingVideoId === video.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-1 sm:mr-0" />
                                <span className="sm:hidden">Add to Queue</span>
                              </>
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-lg font-medium">No popular songs available</p>
                    <p className="text-sm">Try searching for specific songs instead</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="queue" className="mt-0">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <h3 className="text-base sm:text-lg font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Current Queue
                  </h3>
                </div>
                
                {queue.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <PlayCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl font-medium mb-2">Queue is empty</p>
                    <p className="text-sm">Add some videos to get the party started!</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-80 sm:max-h-[28rem]">
                    <div className="space-y-2 sm:space-y-3 pr-2 sm:pr-4">
                      {queue.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gradient-to-r from-gray-700/30 to-gray-800/30 rounded-lg hover:from-gray-700/50 hover:to-gray-800/50 transition-all group border border-gray-600/30 hover:border-red-500/30"
                        >
                          {/* Mobile: Queue position and thumbnail in a row */}
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            {/* Queue Position */}
                            <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-lg shadow-red-500/30">
                              {index + 1}
                            </div>
                            
                            {/* Thumbnail */}
                            <Image 
                              src={item.thumbnail} 
                              alt={item.title} 
                              width={80} 
                              height={60} 
                              className="w-16 h-12 sm:w-20 sm:h-15 object-cover rounded-md flex-shrink-0" 
                              style={{ width: 'auto', height: 'auto' }}
                            />
                            
                            {/* Video Info */}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-white group-hover:text-red-400 transition-colors line-clamp-2">
                                {item.title}
                              </h4>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-gray-400 mt-1">
                                <div className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  <span>{item.addedBy}</span>
                                </div>
                                {item.duration > 0 && (
                                  <>
                                    <span className="hidden sm:inline">•</span>
                                    <div className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      <span>{formatDuration(item.duration)}</span>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                            <Button
                              onClick={() => openVideoInNewTab(item.videoId)}
                              size="sm"
                              variant="ghost"
                              className="text-gray-400 hover:text-white h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {isHost && (
                              <Button
                                onClick={() => onRemoveFromQueue(item.id)}
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}