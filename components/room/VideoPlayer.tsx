"use client";

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import YouTube, { YouTubeProps } from 'react-youtube';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, SkipForward, Volume2, VolumeX, Music, RotateCcw, Users, AlertTriangle } from 'lucide-react';
import { VideoState, QueueItem } from '@/hooks/useSocket';
import { extractVideoId } from '@/lib/youtube-api';
import { toast } from 'sonner';
import Image from 'next/image';

interface VideoPlayerProps {
  currentVideo: QueueItem | null;
  videoState: VideoState;
  isHost: boolean;
  onVideoStateChange: (isPlaying: boolean, currentTime: number, action?: string) => void;
  onVideoEnd: () => void;
  onSkip: () => void;
}

// OPTIMIZATION: Memoized VideoPlayer component to prevent unnecessary re-renders
const VideoPlayerComponent = ({
  currentVideo,
  videoState,
  isHost,
  onVideoStateChange,
  onVideoEnd,
  onSkip
}: VideoPlayerProps) => {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [localState, setLocalState] = useState({
    isPlaying: false,
    currentTime: 0
  });
  const [lastSyncTime, setLastSyncTime] = useState(0);
  const [forceReload, setForceReload] = useState(0);
  const [apiLoaded, setApiLoaded] = useState(false);

  // Refs for managing intervals and preventing race conditions
  const isSeekingRef = useRef(false);
  const lastVideoIdRef = useRef<string | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hostSyncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load YouTube API
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadYouTubeAPI = () => {
      if (window.YT && window.YT.Player) {
        setApiLoaded(true);
        return;
      }

      if (document.querySelector('script[src*="youtube"]')) {
        const checkAPI = setInterval(() => {
          if (window.YT && window.YT.Player) {
            setApiLoaded(true);
            clearInterval(checkAPI);
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      
      window.onYouTubeIframeAPIReady = () => {
        setApiLoaded(true);
      };

      script.onerror = () => {
        console.error('Failed to load YouTube API');
        setPlayerError('Failed to load YouTube player');
      };

      document.head.appendChild(script);
    };

    loadYouTubeAPI();
  }, []);

  // Cleanup intervals
  const cleanupIntervals = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = null;
    }
    if (hostSyncIntervalRef.current) {
      clearInterval(hostSyncIntervalRef.current);
      hostSyncIntervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupIntervals();
    };
  }, [cleanupIntervals]);

  const opts: YouTubeProps['opts'] = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: isHost ? 1 : 0,
      disablekb: !isHost ? 1 : 0,
      fs: 1,
      rel: 0,
      showinfo: 0,
      modestbranding: 1,
      playsinline: 1,
      origin: typeof window !== 'undefined' ? window.location.origin : undefined,
      enablejsapi: 1,
      start: 0
    },
  };

  // Reinitialize player when video changes
  const reinitializePlayer = useCallback(() => {
    cleanupIntervals();
    
    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (error) {
        console.warn('Error destroying player:', error);
      }
    }
    
    playerRef.current = null;
    setIsReady(false);
    setPlayerError(null);
    setIsBuffering(false);
    setLocalState({ isPlaying: false, currentTime: 0 });
    setCurrentTime(0);
    setDuration(0);
    setLastSyncTime(0);
    isSeekingRef.current = false;
    
    setForceReload(prev => prev + 1);
  }, [cleanupIntervals]);

  // Handle video changes
  useEffect(() => {
    if (currentVideo && currentVideo.videoId !== lastVideoIdRef.current) {
      lastVideoIdRef.current = currentVideo.videoId;
      reinitializePlayer();
    }
  }, [currentVideo, reinitializePlayer]);

  // Sync with remote state for guests
  useEffect(() => {
    if (!isReady || !playerRef.current || isHost || !currentVideo) {
      return;
    }

    cleanupIntervals();

    const syncWithHost = () => {
      if (isSeekingRef.current) return;

      try {
        const currentPlayerTime = playerRef.current.getCurrentTime();
        const playerState = playerRef.current.getPlayerState();
        const isPlayerPlaying = playerState === 1;

        const timeDiff = Math.abs(currentPlayerTime - videoState.currentTime);
        const shouldSync = timeDiff > 1.0; // Increased threshold to reduce frequent syncing

        if (shouldSync && videoState.currentTime > 0) {
          console.log(`Syncing: player=${currentPlayerTime}s, host=${videoState.currentTime}s, diff=${timeDiff}s`);
          isSeekingRef.current = true;
          playerRef.current.seekTo(videoState.currentTime, true);
          setLastSyncTime(Date.now());

          setTimeout(() => {
            try {
              if (videoState.isPlaying && !isPlayerPlaying) {
                playerRef.current.playVideo();
              } else if (!videoState.isPlaying && isPlayerPlaying) {
                playerRef.current.pauseVideo();
              }
            } catch (error) {
              console.error('Error setting play state after sync:', error);
            }
            isSeekingRef.current = false;
          }, 500);
        } else {
          // Just sync play/pause state if no seeking needed
          if (videoState.isPlaying && !isPlayerPlaying && !isBuffering) {
            playerRef.current.playVideo();
          } else if (!videoState.isPlaying && isPlayerPlaying) {
            playerRef.current.pauseVideo();
          }
        }

        setLocalState({
          isPlaying: videoState.isPlaying,
          currentTime: videoState.currentTime
        });

      } catch (error) {
        console.error('Error syncing video:', error);
      }
    };

    syncWithHost();
    syncIntervalRef.current = setInterval(syncWithHost, 1000); // Reduced frequency

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [videoState, isReady, isHost, currentVideo, isBuffering, cleanupIntervals]);

  // Update current time periodically
  useEffect(() => {
    if (!isReady || !playerRef.current) return;

    cleanupIntervals();

    const updateTime = () => {
      try {
        const time = playerRef.current.getCurrentTime();
        const dur = playerRef.current.getDuration();
        
        if (!isNaN(time)) setCurrentTime(time);
        if (!isNaN(dur)) setDuration(dur);

        if (isHost) {
          setLocalState(prev => ({ ...prev, currentTime: time }));
        }
      } catch (error) {
        // Player might not be ready
      }
    };

    timeUpdateIntervalRef.current = setInterval(updateTime, 1000);

    // Separate interval for host sync broadcasts
    if (isHost) {
      const hostSync = () => {
        try {
          const time = playerRef.current.getCurrentTime();
          const playerState = playerRef.current.getPlayerState();
          const isPlaying = playerState === 1;
          
          if (isPlaying && !isNaN(time)) {
            onVideoStateChange(true, time, 'sync');
          }
        } catch (error) {
          // Player might not be ready
        }
      };

      hostSyncIntervalRef.current = setInterval(hostSync, 2000); // Less frequent sync broadcasts
    }

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
      if (hostSyncIntervalRef.current) {
        clearInterval(hostSyncIntervalRef.current);
        hostSyncIntervalRef.current = null;
      }
    };
  }, [isReady, isHost, onVideoStateChange, cleanupIntervals]);

  const onReady = useCallback(async (event: any) => {
    playerRef.current = event.target;
    setIsReady(true);
    setPlayerError(null);
    setIsBuffering(false);
    
    try {
      event.target.setVolume(volume);
      toast.success('Video loaded successfully');
    } catch (error) {
      console.error('Error in onReady:', error);
      setPlayerError('Failed to initialize video');
    }
  }, [volume]);

  const onPlay = useCallback(() => {
    setLocalState(prev => ({ ...prev, isPlaying: true }));
    setIsBuffering(false);
    
    if (isHost && playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime() || 0;
      onVideoStateChange(true, currentTime, 'play');
    }
  }, [isHost, onVideoStateChange]);

  const onPause = useCallback(() => {
    setLocalState(prev => ({ ...prev, isPlaying: false }));
    
    if (isHost && playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime() || 0;
      onVideoStateChange(false, currentTime, 'pause');
    }
  }, [isHost, onVideoStateChange]);

  const onStateChange = useCallback((event: any) => {
    const currentTime = event.target.getCurrentTime();
    setLocalState(prev => ({ ...prev, currentTime }));

    const YT_STATES = {
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      CUED: 5
    };

    switch (event.data) {
      case YT_STATES.ENDED:
        if (isHost) {
          onVideoEnd();
        }
        break;
      case YT_STATES.BUFFERING:
        setIsBuffering(true);
        break;
      case YT_STATES.PLAYING:
        setIsBuffering(false);
        if (isHost) {
          const time = event.target.getCurrentTime();
          onVideoStateChange(true, time, 'playing');
        }
        break;
      case YT_STATES.PAUSED:
        setIsBuffering(false);
        if (isHost) {
          const time = event.target.getCurrentTime();
          onVideoStateChange(false, time, 'paused');
        }
        break;
    }
  }, [isHost, onVideoEnd, onVideoStateChange]);

  const onError = useCallback((event: any) => {
    const errorCode = event.data;
    let errorMessage = 'Video playback error';

    switch (errorCode) {
      case 2:
        errorMessage = 'Invalid video parameter';
        break;
      case 5:
        errorMessage = 'HTML5 player error';
        break;
      case 100:
        errorMessage = 'Video not found';
        break;
      case 101:
      case 150:
        errorMessage = 'Video cannot be embedded';
        break;
    }

    setPlayerError(errorMessage);
    toast.error(`${errorMessage}. Skipping to next video...`);
    
    if (isHost) {
      setTimeout(onSkip, 2000);
    }
  }, [isHost, onSkip]);

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current || !isHost) {
      if (!isHost) {
        toast.warning('Only the host can control playback');
      }
      return;
    }

    try {
      const currentTime = playerRef.current.getCurrentTime();
      if (localState.isPlaying) {
        playerRef.current.pauseVideo();
        onVideoStateChange(false, currentTime, 'pause');
      } else {
        playerRef.current.playVideo();
        onVideoStateChange(true, currentTime, 'play');
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
      toast.error('Failed to control playback');
    }
  }, [isHost, localState.isPlaying, onVideoStateChange]);

  const handleVolumeChange = useCallback((newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    
    if (playerRef.current) {
      try {
        playerRef.current.setVolume(vol);
        if (vol === 0) {
          setIsMuted(true);
        } else if (isMuted) {
          setIsMuted(false);
        }
      } catch (error) {
        console.error('Error setting volume:', error);
      }
    }
  }, [isMuted]);

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;

    try {
      if (isMuted) {
        playerRef.current.unMute();
        playerRef.current.setVolume(volume);
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  }, [isMuted, volume]);

  const handleReload = useCallback(() => {
    reinitializePlayer();
    toast.info('Reloading player...');
  }, [reinitializePlayer]);

  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  if (!currentVideo) {
    return (
      <Card className="p-6 bg-gray-800 border-red-500/30">
        <div className="aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <Music className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Video Playing</h3>
            <p className="text-gray-400">Add a video to the queue to get started!</p>
          </div>
        </div>
      </Card>
    );
  }

  const videoId = extractVideoId(currentVideo.videoId) || currentVideo.videoId;

  return (
    <Card className="p-4 bg-gray-800 border-red-500/30">
      <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
        {!apiLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
              <p className="text-white">Loading YouTube player...</p>
            </div>
          </div>
        ) : playerError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-900/20">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-300 mb-2">Playback Error</h3>
              <p className="text-red-400 mb-4">{playerError}</p>
              <Button onClick={handleReload} className="bg-red-500 hover:bg-red-600">
                <RotateCcw className="w-4 h-4 mr-2" />
                Reload Player
              </Button>
            </div>
          </div>
        ) : (
          <>
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
                  <p className="text-white">Loading video...</p>
                </div>
              </div>
            )}
            
            <div className="w-full h-full">
              <YouTube
                key={`${videoId}-${forceReload}`}
                videoId={videoId}
                opts={opts}
                onReady={onReady}
                onPlay={onPlay}
                onPause={onPause}
                onStateChange={onStateChange}
                onError={onError}
                className="w-full h-full"
                iframeClassName="w-full h-full"
              />
            </div>
          </>
        )}
      </div>

      {/* Video Info */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-white truncate">
              {currentVideo.title}
            </h3>
            <p className="text-sm text-gray-400">
              Added by {currentVideo.addedBy}
            </p>
          </div>
          <Image
            src={currentVideo.thumbnail}
            alt={currentVideo.title}
            width={640}
            height={360}
            className="w-16 h-12 object-cover rounded"
            style={{ width: 'auto' }}
          />
        </div>

        {/* Progress Bar */}
        {duration > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-red-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isHost ? (
              <Button
                onClick={handlePlayPause}
                disabled={!isReady || !!playerError}
                className="bg-red-500 hover:bg-red-600"
              >
                {localState.isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Users className="w-4 h-4" />
                <span>Synced with host</span>
                {lastSyncTime > 0 && (
                  <span className="text-xs">
                    (Last sync: {Math.floor((Date.now() - lastSyncTime) / 1000)}s ago)
                  </span>
                )}
              </div>
            )}
            
            <Button
              onClick={onSkip}
              size="sm"
              variant="outline"
              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
            >
              <SkipForward className="w-4 h-4 mr-1" />
              Skip
            </Button>
          </div>

          {/* Volume Controls */}
          <div className="flex items-center gap-2">
            <Button
              onClick={toggleMute}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            
            <div className="w-24">
              <Slider
                value={[isMuted ? 0 : volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
            
            <span className="text-sm text-gray-400 w-8">
              {isMuted ? 0 : volume}
            </span>
          </div>
        </div>

        {/* Status */}
        <div className="mt-3 pt-3 border-t border-gray-700 text-center text-sm text-gray-400">
          {isHost ? (
            'You are the host - you control playback'
          ) : (
            `Synced with host - ${videoState.isPlaying ? 'Playing' : 'Paused'} at ${formatTime(videoState.currentTime)}`
          )}
        </div>
      </div>
    </Card>
  );
};

// OPTIMIZATION: Export memoized component with custom comparison
export const VideoPlayer = memo(VideoPlayerComponent, (prevProps, nextProps) => {
  // Custom comparison for better performance
  // Compare by videoId (the QueueItem uses `videoId`) and key playback properties
  const prevId = prevProps.currentVideo?.videoId ?? null;
  const nextId = nextProps.currentVideo?.videoId ?? null;

  return (
    prevId === nextId &&
    prevProps.videoState?.isPlaying === nextProps.videoState?.isPlaying &&
    prevProps.videoState?.currentTime === nextProps.videoState?.currentTime &&
    prevProps.isHost === nextProps.isHost
  );
});