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
  YouTubeSearchResult
} from '@/lib/youtube-api-enhanced';
import { toast } from 'sonner';

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
        const { results, isMock } = await getPopularKaraokeSongs();
        setPopularSongs(results);
        setIsPopularMock(isMock);

        if (isMock) {
          console.log('Using mock popular songs - YouTube API not configured');
        }
      } catch (error) {
        console.error('Error loading popular songs:', error);
        toast.error('Failed to load popular songs');
      } finally {
        setIsLoadingPopular(false);
      }
    };

    loadPopularSongs();
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
      const isEmbeddable = await checkVideoEmbeddable(videoId);
      if (!isEmbeddable) {
        toast.error('This video cannot be embedded and played');
        return;
      }

      const videoDetails = await getVideoDetails(videoId);
      if (!videoDetails) {
        toast.error('Could not fetch video details');
        return;
      }

      if (videoDetails.duration > 600) {
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
      const { results, isMock } = await searchYouTubeVideos(searchQuery, 15);
      setSearchResults(results);
      setIsSearchMock(isMock);

      if (isMock) {
        toast.info('Using mock search results - YouTube API not configured', {
          description: 'Configure your YouTube API key for real search results'
        });
      } else if (results.length === 0) {
        toast.info('No videos found for your search');
      } else {
        toast.success(`Found ${results.length} videos`);
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddFromSearch = async (video: YouTubeSearchResult) => {
    setAddingVideoId(video.id);
    try {
      const isEmbeddable = await checkVideoEmbeddable(video.id);
      if (!isEmbeddable) {
        toast.error('This video cannot be embedded and played');
        return;
      }

      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
      const thumbnail = getVideoThumbnail(video.id, 'medium');

      const videoDetails = await getVideoDetails(video.id);
      const duration = videoDetails?.duration || 0;

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 bg-red-500/20 rounded-lg">
            <ListMusic className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Video Queue</h2>
            <p className="text-sm sm:text-base text-gray-400">Add songs and manage the karaoke queue</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-red-500/20 text-red-400 px-2 py-0.5 sm:px-3 sm:py-1 text-xs sm:text-sm self-start sm:self-auto">
          {queue.length} in queue
        </Badge>
      </div>

      {/* Main Queue Interface */}
      <Card className="bg-gray-800/50 border-red-500/30 overflow-hidden">
        <Tabs defaultValue="add" className="w-full">
          <div className="border-b border-gray-700 bg-gray-900/50">
            <TabsList className="grid grid-cols-3 bg-transparent border-none h-12 sm:h-14">
              <TabsTrigger
                value="add"
                className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none border-b-2 border-transparent transition-all text-xs sm:text-sm"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Add Songs
              </TabsTrigger>
              <TabsTrigger
                value="popular"
                className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none border-b-2 border-transparent transition-all text-xs sm:text-sm"
              >
                <Music className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Popular
                {isPopularMock && (
                  <Badge variant="secondary" className="ml-1 text-[10px] sm:text-xs bg-yellow-500/20 text-yellow-400">
                    MOCK
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="queue"
                className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none border-b-2 border-transparent transition-all text-xs sm:text-sm"
              >
                <PlayCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Queue ({queue.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 sm:p-6">
            <TabsContent value="add" className="space-y-4 sm:space-y-6 mt-0">
              {/* Add by URL Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">Add by YouTube URL</h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Input
                    placeholder="Paste YouTube URL here..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20 h-10 sm:h-12 text-sm sm:text-base"
                    onKeyPress={(e) => handleKeyPress(e, 'url')}
                    disabled={isAdding}
                  />
                  <Button
                    onClick={handleAddByUrl}
                    disabled={isAdding || !videoUrl.trim()}
                    className="bg-red-500 hover:bg-red-600 px-4 h-10 sm:h-12"
                  >
                    {isAdding ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-gray-400">
                  Supports youtube.com and youtu.be URLs. Non-embeddable videos will be automatically filtered out.
                </p>
              </div>

              {/* Search Section */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">Search YouTube</h3>
                  {isSearchMock && (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 text-[10px] sm:text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      MOCK DATA
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Input
                    placeholder="Search for karaoke songs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20 h-10 sm:h-12 text-sm sm:text-base"
                    onKeyPress={(e) => handleKeyPress(e, 'search')}
                    disabled={isSearching}
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-red-500 hover:bg-red-600 px-4 h-10 sm:h-12"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {isSearchMock && (
                  <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-2 sm:p-3">
                    <div className="flex items-center gap-2 text-yellow-300 text-xs sm:text-sm">
                      <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="font-medium">Mock Search Results</span>
                    </div>
                    <p className="text-yellow-200 text-[10px] sm:text-xs mt-1">
                      Configure your YouTube API key in environment variables for real search results
                    </p>
                  </div>
                )}

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs sm:text-sm font-medium text-gray-300">
                      Search Results {isSearchMock ? '(Mock Data)' : '(Live Results)'}
                    </h4>
                    <ScrollArea className="h-64 sm:h-80">
                      <div className="space-y-2 sm:space-y-3 pr-2 sm:pr-4">
                        {searchResults.map((video) => (
                          <div
                            key={video.id}
                            className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all group"
                          >
                            <img
                              src={video.thumbnail}
                              alt={video.title}
                              className="w-20 h-15 sm:w-24 sm:h-18 object-cover rounded-md flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs sm:text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                                {video.title}
                              </h4>
                              <p className="text-[10px] sm:text-xs text-gray-400 truncate mt-1">
                                {video.channelTitle}
                              </p>
                              <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
                                <Badge variant="secondary" className="text-[10px] sm:text-xs bg-gray-600 text-gray-300">
                                  {video.duration}
                                </Badge>
                                {isSearchMock && (
                                  <Badge variant="secondary" className="text-[10px] sm:text-xs bg-yellow-500/20 text-yellow-400">
                                    Mock
                                  </Badge>
                                )}
                                <button
                                  onClick={() => openVideoInNewTab(video.id)}
                                  className="text-[10px] sm:text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                  Preview
                                </button>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleAddFromSearch(video)}
                              size="sm"
                              disabled={addingVideoId === video.id}
                              className="bg-red-500 hover:bg-red-600 flex-shrink-0 h-8 sm:h-9"
                            >
                              {addingVideoId === video.id ? (
                                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                              ) : (
                                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                              )}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="popular" className="mt-0">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">Popular Karaoke Songs</h3>
                  {isPopularMock && (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 text-[10px] sm:text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      MOCK DATA
                    </Badge>
                  )}
                </div>

                {isPopularMock && (
                  <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-2 sm:p-3">
                    <div className="flex items-center gap-2 text-yellow-300 text-xs sm:text-sm">
                      <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="font-medium">Mock Popular Songs</span>
                    </div>
                    <p className="text-yellow-200 text-[10px] sm:text-xs mt-1">
                      Configure your YouTube API key in environment variables for real popular songs
                    </p>
                  </div>
                )}

                {isLoadingPopular ? (
                  <div className="flex items-center justify-center py-8 sm:py-12">
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-red-500 mx-auto mb-2 sm:mb-3" />
                      <span className="text-sm sm:text-base text-gray-400">Loading popular songs...</span>
                    </div>
                  </div>
                ) : popularSongs.length > 0 ? (
                  // <ScrollArea className="h-80 sm:h-96">
                  <div className="space-y-2 sm:space-y-3 pr-2 h-80 sm:h-96 overflow-y-auto custom-scrollbar">
                    {popularSongs.map((video) => (
                      <div
                        key={video.id}
                        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all group"
                      >
                        {/* Thumbnail on the left */}
                        <img
                          src={video.thumbnail}
                          alt={video.title}
                          className="flex-none w-20 h-15 sm:w-24 sm:h-18 object-cover rounded-md"
                        />
                        {/* Middle content with wrapping */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                            {video.title}
                          </h4>
                          <p className="text-[10px] sm:text-xs text-gray-400 truncate mt-1">
                            {video.channelTitle}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
                            <Badge variant="secondary" className="text-[10px] sm:text-xs bg-gray-600 text-gray-300">
                              {video.duration}
                            </Badge>
                            {isPopularMock && (
                              <Badge variant="secondary" className="text-[10px] sm:text-xs bg-yellow-500/20 text-yellow-400">
                                Mock
                              </Badge>
                            )}
                            <button
                              onClick={() => openVideoInNewTab(video.id)}
                              className="text-[10px] sm:text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                            >
                              <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              Preview
                            </button>
                          </div>
                        </div>
                        {/* Add button on the right */}
                        <Button
                          onClick={() => handleAddFromSearch(video)}
                          size="sm"
                          disabled={addingVideoId === video.id}
                          className="flex-none bg-red-500 hover:bg-red-600 h-8 sm:h-9"
                        >
                          {addingVideoId === video.id ? (
                            <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                          ) : (
                            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                  // </ScrollArea>
                ) : (
                  <div className="text-center py-8 sm:py-12 text-gray-400">
                    <Music className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 sm:mb-3 opacity-50" />
                    <p className="text-base sm:text-lg font-medium">No popular songs available</p>
                    <p className="text-xs sm:text-sm">Try searching for specific songs instead</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="queue" className="mt-0">
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full"></div>
                  <h3 className="text-base sm:text-lg font-semibold text-white">Current Queue</h3>
                </div>

                {queue.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-gray-400">
                    <PlayCircle className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50" />
                    <p className="text-lg sm:text-xl font-medium mb-2">Queue is empty</p>
                    <p className="text-xs sm:text-sm">Add some videos to get the party started!</p>
                  </div>
                ) : (
                  <ScrollArea className="h-80 sm:h-96">
                    <div className="space-y-2 sm:space-y-3 pr-2 sm:pr-4">
                      {queue.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all group"
                        >
                          <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-red-500 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white">
                            {index + 1}
                          </div>
                          <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-16 h-12 sm:w-20 sm:h-15 object-cover rounded-md flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs sm:text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-400 mt-1">
                              <div className="flex items-center gap-1">
                                <User className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                <span>{item.addedBy}</span>
                              </div>
                              {item.duration > 0 && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                                    <span>{formatDuration(item.duration)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                            <Button
                              onClick={() => openVideoInNewTab(item.videoId)}
                              size="sm"
                              variant="ghost"
                              className="text-gray-400 hover:text-white h-7 w-7 sm:h-8 sm:w-8 p-0"
                            >
                              <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                            {isHost && (
                              <Button
                                onClick={() => onRemoveFromQueue(item.id)}
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/20 h-7 w-7 sm:h-8 sm:w-8 p-0"
                              >
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
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