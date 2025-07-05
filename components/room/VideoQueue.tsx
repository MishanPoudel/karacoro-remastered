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
      const { results, isMock } = await searchYouTubeVideos(searchQuery, 15);
      // Filter out results from the "singking" channel
      const filteredResults = results.filter(
        (video) => video.channelTitle.toLowerCase() !== 'sing king'
      );
      setSearchResults(filteredResults);
      setIsSearchMock(isMock);
      
      if (isMock) {
        toast.info('Using mock search results - YouTube API not configured', {
          description: 'Configure your YouTube API key for real search results'
        });
      } else if (filteredResults.length === 0) {
        toast.info('No videos found for your search');
      } else {
        toast.success(`Found ${filteredResults.length} videos`);
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
      // Double-check if video is embeddable
      const isEmbeddable = await checkVideoEmbeddable(video.id);
      if (!isEmbeddable) {
        toast.error('This video cannot be embedded and played');
        return;
      }

      const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
      const thumbnail = getVideoThumbnail(video.id, 'medium');
      
      // Get detailed duration info
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <ListMusic className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Video Queue</h2>
            <p className="text-gray-400">Add songs and manage the karaoke queue</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-red-500/20 text-red-400 px-3 py-1">
          {queue.length} in queue
        </Badge>
      </div>

      {/* Main Queue Interface */}
      <Card className="bg-gray-800/50 border-red-500/30 overflow-hidden">
        <Tabs defaultValue="add" className="w-full">
          <div className="border-b border-gray-700 bg-gray-900/50">
            <TabsList className="grid w-full grid-cols-3 bg-transparent border-none h-14">
              <TabsTrigger 
                value="add" 
                className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none border-b-2 border-transparent transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Songs
              </TabsTrigger>
              <TabsTrigger 
                value="popular"
                className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none border-b-2 border-transparent transition-all"
              >
                <Music className="w-4 h-4 mr-2" />
                Popular
                {isPopularMock && (
                  <Badge variant="secondary" className="ml-1 text-xs bg-yellow-500/20 text-yellow-400">
                    MOCK
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger 
                value="queue"
                className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400 data-[state=active]:border-b-2 data-[state=active]:border-red-500 rounded-none border-b-2 border-transparent transition-all"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Queue ({queue.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="add" className="space-y-6 mt-0">
              {/* Add by URL Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-white">Add by YouTube URL</h3>
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder="Paste YouTube URL here..."
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="flex-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20 h-12"
                    onKeyPress={(e) => handleKeyPress(e, 'url')}
                    disabled={isAdding}
                  />
                  <Button
                    onClick={handleAddByUrl}
                    disabled={isAdding || !videoUrl.trim()}
                    className="bg-red-500 hover:bg-red-600 px-6 h-12"
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
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-white">Search YouTube</h3>
                  {isSearchMock && (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      MOCK DATA
                    </Badge>
                  )}
                </div>
                <div className="flex gap-3">
                  <Input
                    placeholder="Search for karaoke songs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-red-500 focus:ring-red-500/20 h-12"
                    onKeyPress={(e) => handleKeyPress(e, 'search')}
                    disabled={isSearching}
                  />
                  <Button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="bg-red-500 hover:bg-red-600 px-6 h-12"
                  >
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
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
                    <h4 className="text-sm font-medium text-gray-300">
                      Search Results {isSearchMock ? '(Mock Data)' : '(Live Results)'}
                    </h4>
                    <ScrollArea className="h-80">
                      <div className="space-y-3 pr-4">
                        {searchResults.map((video) => (
                          <div
                            key={video.id}
                            className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all group"
                          >
                            <Image src={video.thumbnail} alt={video.title} width={96} height={72} className="w-24 h-18 object-cover rounded-md flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                                {video.title}
                              </h4>
                              <p className="text-xs text-gray-400 truncate mt-1">
                                {video.channelTitle}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
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
                              className="bg-red-500 hover:bg-red-600 flex-shrink-0"
                            >
                              {addingVideoId === video.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Plus className="w-4 h-4" />
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
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-white">Popular Karaoke Songs</h3>
                  {isPopularMock && (
                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 text-xs">
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
                  <ScrollArea className="h-96">
                    <div className="space-y-3 pr-4">
                      {popularSongs.map((video) => (
                        <div
                          key={video.id}
                          className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all group"
                        >
                          <Image src={video.thumbnail} alt={video.title} width={96} height={72} className="w-24 h-18 object-cover rounded-md flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                              {video.title}
                            </h4>
                            <p className="text-xs text-gray-400 truncate mt-1">
                              {video.channelTitle}
                            </p>
                            <div className="flex items-center gap-3 mt-2">
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
                            className="bg-red-500 hover:bg-red-600 flex-shrink-0"
                          >
                            {addingVideoId === video.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
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
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <h3 className="text-lg font-semibold text-white">Current Queue</h3>
                </div>
                
                {queue.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <PlayCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl font-medium mb-2">Queue is empty</p>
                    <p className="text-sm">Add some videos to get the party started!</p>
                  </div>
                ) : (
                  <ScrollArea className="h-96">
                    <div className="space-y-3 pr-4">
                      {queue.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-all group"
                        >
                          {/* Queue Position */}
                          <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-sm font-bold text-white">
                            {index + 1}
                          </div>
                          
                          {/* Thumbnail */}
                          <Image src={item.thumbnail} alt={item.title} width={80} height={60} className="w-20 h-15 object-cover rounded-md flex-shrink-0" />
                          
                          {/* Video Info */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-white truncate group-hover:text-red-400 transition-colors">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                <span>{item.addedBy}</span>
                              </div>
                              {item.duration > 0 && (
                                <>
                                  <span>•</span>
                                  <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{formatDuration(item.duration)}</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
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