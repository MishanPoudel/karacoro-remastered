"use client";

import { useEffect, useRef, useState, useCallback, memo } from "react";
import YouTube, { YouTubeProps } from "react-youtube";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import ElasticSlider from "@/components/ui/elastic-slider";
import {
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
  Music,
  RotateCcw,
  Users,
  AlertTriangle,
  Crown,
} from "lucide-react";
import { VideoState, QueueItem } from "@/hooks/useSocket";
import { extractVideoId } from "@/lib/youtube-api";
import { toast } from "sonner";
import Image from "next/image";

interface VideoPlayerProps {
  currentVideo: QueueItem | null;
  videoState: VideoState;
  isHost: boolean;
  onVideoStateChange: (
    isPlaying: boolean,
    currentTime: number,
    action?: string
  ) => void;
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
  onSkip,
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
    currentTime: 0,
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
  const consecutiveSyncsRef = useRef(0);
  const lastKnownGoodTimeRef = useRef(0);

  // Load YouTube API
  useEffect(() => {
    if (typeof window === "undefined") return;

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

      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;

      window.onYouTubeIframeAPIReady = () => {
        setApiLoaded(true);
      };

      script.onerror = () => {
        console.error("Failed to load YouTube API");
        setPlayerError("Failed to load YouTube player");
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

  const opts: YouTubeProps["opts"] = {
    height: "100%",
    width: "100%",
    playerVars: {
      autoplay: 0,
      controls: isHost ? 1 : 0,
      disablekb: !isHost ? 1 : 0,
      fs: 1,
      rel: 0,
      showinfo: 0,
      modestbranding: 1,
      playsinline: 1,
      origin:
        typeof window !== "undefined" ? window.location.origin : undefined,
      enablejsapi: 1,
      start: 0,
      // Optimize buffering for smoother playback
      iv_load_policy: 3, // Hide annotations
      cc_load_policy: 0, // Hide closed captions by default
      widget_referrer:
        typeof window !== "undefined" ? window.location.href : undefined,
    },
  };

  // Reinitialize player when video changes
  const reinitializePlayer = useCallback(() => {
    cleanupIntervals();

    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch (error) {
        console.warn("Error destroying player:", error);
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

    setForceReload((prev) => prev + 1);
  }, [cleanupIntervals]);

  // Handle video changes
  useEffect(() => {
    if (currentVideo && currentVideo.videoId !== lastVideoIdRef.current) {
      lastVideoIdRef.current = currentVideo.videoId;
      reinitializePlayer();
    }
  }, [currentVideo, reinitializePlayer]);

  // Improved sync with remote state for guests - ULTRA SMOOTH
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
        const isPlayerBuffering = playerState === 3;
        const targetTime = videoState.currentTime;

        if (targetTime === 0 || isPlayerBuffering) {
          consecutiveSyncsRef.current = 0;
          return;
        }

        const timeDrift = targetTime - currentPlayerTime;
        const absDrift = Math.abs(timeDrift);

        // Update last known good position if drift is acceptable
        if (absDrift < 0.3) {
          lastKnownGoodTimeRef.current = currentPlayerTime;
          consecutiveSyncsRef.current = 0;
        }

        // TIER 1: Perfect sync (< 0.3s) - no action
        if (absDrift < 0.3) {
          playerRef.current.setPlaybackRate(1.0);
        }
        // TIER 2: Micro adjustment (0.3-1.5s) - very gentle rate change
        else if (absDrift < 1.5) {
          if (timeDrift < 0) {
            playerRef.current.setPlaybackRate(1.08); // Slightly faster
          } else {
            playerRef.current.setPlaybackRate(0.97); // Slightly slower
          }
          consecutiveSyncsRef.current = 0;
        }
        // TIER 3: Moderate drift (1.5-3s) - more aggressive rate
        else if (absDrift < 3.0) {
          if (timeDrift < 0) {
            playerRef.current.setPlaybackRate(1.15); // Faster
          } else {
            playerRef.current.setPlaybackRate(0.92); // Slower
          }
          consecutiveSyncsRef.current++;
        }
        // TIER 4: Large drift (3s+) - hard sync required
        else {
          consecutiveSyncsRef.current++;

          // Only hard sync if drift persists for 2+ cycles OR drift is huge (>5s)
          if (consecutiveSyncsRef.current > 1 || absDrift > 5) {
            console.log(`🔄 Syncing: drift=${absDrift.toFixed(2)}s`);
            isSeekingRef.current = true;

            // Predictive seek: account for network delay
            const predictiveTime = targetTime + 0.2;
            playerRef.current.seekTo(predictiveTime, true);
            setLastSyncTime(Date.now());

            setTimeout(() => {
              try {
                if (videoState.isPlaying) {
                  playerRef.current.playVideo();
                }
                playerRef.current.setPlaybackRate(1.0);
              } catch (error) {
                console.error("Sync error:", error);
              }
              isSeekingRef.current = false;
              consecutiveSyncsRef.current = 0;
            }, 250);
          }
        }

        // Sync play/pause state
        if (
          videoState.isPlaying &&
          !isPlayerPlaying &&
          !isBuffering &&
          !isPlayerBuffering
        ) {
          playerRef.current.playVideo();
        } else if (!videoState.isPlaying && isPlayerPlaying) {
          playerRef.current.pauseVideo();
          playerRef.current.setPlaybackRate(1.0);
        }

        setLocalState({
          isPlaying: videoState.isPlaying,
          currentTime: targetTime,
        });
      } catch (error) {
        console.error("Sync error:", error);
      }
    };

    syncWithHost();
    syncIntervalRef.current = setInterval(syncWithHost, 400); // Faster checks for smoother sync

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
      if (playerRef.current) {
        try {
          playerRef.current.setPlaybackRate(1.0);
        } catch (e) {}
      }
    };
  }, [
    videoState,
    isReady,
    isHost,
    currentVideo,
    isBuffering,
    cleanupIntervals,
  ]);

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
          setLocalState((prev) => ({ ...prev, currentTime: time }));
        }
      } catch (error) {
        // Player might not be ready
      }
    };

    timeUpdateIntervalRef.current = setInterval(updateTime, 500); // Faster updates

    // Separate interval for host sync broadcasts - HIGH FREQUENCY
    if (isHost) {
      const hostSync = () => {
        try {
          const time = playerRef.current.getCurrentTime();
          const playerState = playerRef.current.getPlayerState();
          const isPlaying = playerState === 1;
          const isBuffering = playerState === 3;

          if (isPlaying && !isBuffering && !isNaN(time) && time > 0) {
            onVideoStateChange(true, time, "sync");
          }
        } catch (error) {}
      };

      hostSyncIntervalRef.current = setInterval(hostSync, 800); // Faster broadcasts
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

  const onReady = useCallback(
    async (event: any) => {
      playerRef.current = event.target;
      setIsReady(true);
      setPlayerError(null);
      setIsBuffering(false);

      try {
        event.target.setVolume(volume);
        if (!isHost) {
          // Preload for smoother playback
          event.target.setPlaybackQuality("hd720");
        }
        toast.success("Video ready");
      } catch (error) {
        console.error("Error in onReady:", error);
        setPlayerError("Failed to initialize video");
      }
    },
    [volume, isHost]
  );

  const onPlay = useCallback(() => {
    setLocalState((prev) => ({ ...prev, isPlaying: true }));
    setIsBuffering(false);

    if (isHost && playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime() || 0;
      onVideoStateChange(true, currentTime, "play");
    }
  }, [isHost, onVideoStateChange]);

  const onPause = useCallback(() => {
    setLocalState((prev) => ({ ...prev, isPlaying: false }));

    if (isHost && playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime() || 0;
      onVideoStateChange(false, currentTime, "pause");
    }
  }, [isHost, onVideoStateChange]);

  const onStateChange = useCallback(
    (event: any) => {
      const currentTime = event.target.getCurrentTime();
      setLocalState((prev) => ({ ...prev, currentTime }));

      const YT_STATES = {
        ENDED: 0,
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        CUED: 5,
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
            onVideoStateChange(true, time, "playing");
          }
          break;
        case YT_STATES.PAUSED:
          setIsBuffering(false);
          if (isHost) {
            const time = event.target.getCurrentTime();
            onVideoStateChange(false, time, "paused");
          }
          break;
      }
    },
    [isHost, onVideoEnd, onVideoStateChange]
  );

  const onError = useCallback(
    (event: any) => {
      const errorCode = event.data;
      let errorMessage = "Video playback error";

      switch (errorCode) {
        case 2:
          errorMessage = "Invalid video parameter";
          break;
        case 5:
          errorMessage = "HTML5 player error";
          break;
        case 100:
          errorMessage = "Video not found";
          break;
        case 101:
        case 150:
          errorMessage = "Video cannot be embedded";
          break;
      }

      setPlayerError(errorMessage);
      toast.error(`${errorMessage}. Skipping to next video...`);

      if (isHost) {
        setTimeout(onSkip, 2000);
      }
    },
    [isHost, onSkip]
  );

  const handlePlayPause = useCallback(() => {
    if (!playerRef.current || !isHost) {
      if (!isHost) {
        toast.warning("Only the host can control playback");
      }
      return;
    }

    try {
      const currentTime = playerRef.current.getCurrentTime();
      if (localState.isPlaying) {
        playerRef.current.pauseVideo();
        onVideoStateChange(false, currentTime, "pause");
      } else {
        playerRef.current.playVideo();
        onVideoStateChange(true, currentTime, "play");
      }
    } catch (error) {
      console.error("Error toggling play/pause:", error);
      toast.error("Failed to control playback");
    }
  }, [isHost, localState.isPlaying, onVideoStateChange]);

  const handleVolumeChange = useCallback(
    (newVolume: number[]) => {
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
          console.error("Error setting volume:", error);
        }
      }
    },
    [isMuted]
  );

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
      console.error("Error toggling mute:", error);
    }
  }, [isMuted, volume]);

  const handleReload = useCallback(() => {
    reinitializePlayer();
    toast.info("Reloading player...");
  }, [reinitializePlayer]);

  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  if (!currentVideo) {
    return (
      <Card className="p-8 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-red-500/30 shadow-2xl">
        <div className="aspect-video bg-gradient-to-br from-gray-900 to-black rounded-2xl flex items-center justify-center border border-red-500/20 p-12">
          <div className="text-center">
            <div className="p-6 bg-red-500/10 rounded-full w-fit mx-auto mb-6">
              <Music className="w-14 h-14 sm:w-20 sm:h-20 text-red-400/50" />
            </div>
            <h3 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-3">
              No Video Playing
            </h3>
            <p className="text-gray-400 text-sm sm:text-lg">
              Add a video to the queue to get started!
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const videoId = extractVideoId(currentVideo.videoId) || currentVideo.videoId;

  return (
    <Card className="p-4 bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-red-500/30 shadow-2xl">
      <div className="aspect-video bg-black rounded-2xl overflow-hidden relative border border-red-500/20 shadow-2xl shadow-red-500/10">
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
              <h3 className="text-lg font-semibold text-red-300 mb-2">
                Playback Error
              </h3>
              <p className="text-red-400 mb-4">{playerError}</p>
              <Button
                onClick={handleReload}
                className="bg-red-500 hover:bg-red-600"
              >
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

      {/* Video Info with Gradient */}
      <div className="mt-4 bg-gradient-to-r from-red-500/10 to-transparent rounded-xl p-4 border border-red-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0 mr-4">
            <h3 className="text-lg font-bold text-white truncate mb-1">
              {currentVideo.title}
            </h3>
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <span>Added by</span>
              <span className="text-red-400 font-medium">
                {currentVideo.addedBy}
              </span>
            </p>
          </div>
          <div className="flex-shrink-0">
            <Image
              src={currentVideo.thumbnail}
              alt={currentVideo.title}
              width={120}
              height={68}
              className="w-[120px] h-[68px] object-cover rounded-lg border border-red-500/30 shadow-lg"
              style={{ width: "auto" }}
            />
          </div>
        </div>

        {/* Progress Bar with Glow */}
        {duration > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
              <span className="font-mono">{formatTime(currentTime)}</span>
              <span className="font-mono">{formatTime(duration)}</span>
            </div>
            <div className="w-full bg-gray-700/50 rounded-full h-2.5 overflow-hidden border border-gray-600/30">
              <div
                className="bg-gradient-to-r from-red-500 to-red-600 h-2.5 rounded-full transition-all duration-500 shadow-lg shadow-red-500/50"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Controls with Better Design */}
        <div className="flex flex-col sm:flex-row items-stretch justify-between gap-3 bg-gray-800/50 rounded-xl p-3 border border-gray-700/50">
          {/* Left: Playback Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {isHost ? (
              <Button
                onClick={handlePlayPause}
                disabled={!isReady || !!playerError}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-red-500/30 transition-all"
                size="sm"
              >
                {localState.isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-700/30 px-3 py-1.5 rounded-lg">
                <div className="relative">
                  <Users className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                </div>
                <span className="hidden sm:inline">Synced</span>
              </div>
            )}

            {isHost && (
              <Button
                onClick={onSkip}
                size="sm"
                variant="outline"
                className="border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                disabled={!isReady || !!playerError}
              >
                <SkipForward className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Skip</span>
              </Button>
            )}
          </div>

          {/* Right: Volume Controls - Responsive (shifted a bit left) */}
          {/* Desktop volume controls (hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 flex-shrink-0 -mr-0 sm:-mr-1 md:-mr-2 lg:-mr-3">
            <div className="min-w-0 w-20 sm:w-24 md:w-28 lg:w-32 xl:w-36">
              <ElasticSlider
                leftIcon={<VolumeX className="w-4 h-4 text-gray-400" />}
                rightIcon={<Volume2 className="w-4 h-4 text-gray-400" />}
                startingValue={0}
                defaultValue={volume}
                maxValue={100}
                isStepped={false}
                stepSize={1}
                onChange={(v) => handleVolumeChange([v])}
              />
            </div>
          </div>

          {/* Mobile: show sync/status and compact volume on the same line */}
          <div className="flex sm:hidden items-center justify-between w-full gap-3 mt-3">
            <div>
              {isHost ? (
                <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-400 px-3 py-1.5 rounded-lg border border-yellow-500/20">
                  <Crown className="w-4 h-4" />
                  <span className="text-xs font-medium">Host</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-700/30 px-3 py-1.5 rounded-lg">
                  <div className="relative">
                    <Users className="w-4 h-4" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  </div>
                  <span className="text-xs">Synced</span>
                </div>
              )}
            </div>

            <div className="w-36">
              <ElasticSlider
                className="w-full"
                leftIcon={<VolumeX className="w-4 h-4 text-gray-400" />}
                rightIcon={<Volume2 className="w-4 h-4 text-gray-400" />}
                startingValue={0}
                defaultValue={volume}
                maxValue={100}
                isStepped={false}
                stepSize={1}
                onChange={(v) => handleVolumeChange([v])}
              />
            </div>
          </div>
        </div>

        {/* Status with Modern Design */}
        <div className="mt-3 pt-3 border-t border-red-500/20 text-center text-sm">
          {isHost ? (
            <div className="flex items-center justify-center gap-2 text-yellow-400 bg-yellow-500/10 py-2 rounded-lg px-2">
              <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse" />
              <span className="font-medium text-sm sm:text-base">
                Host Controls • You manage playback and can skip videos
              </span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-green-400 bg-green-500/10 py-2 rounded-lg">
                <div className="relative">
                  <Users className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                </div>
                <span>
                  Synced • {videoState.isPlaying ? "Playing" : "Paused"} at{" "}
                  {formatTime(videoState.currentTime)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Only the host can skip videos
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

// OPTIMIZATION: Export memoized component with custom comparison
export const VideoPlayer = memo(
  VideoPlayerComponent,
  (prevProps, nextProps) => {
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
  }
);
