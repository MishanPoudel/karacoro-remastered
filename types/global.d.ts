// Global type declarations
declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: any) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
    webkitAudioContext: typeof AudioContext;
    __KARAOKE_SOCKET__: any;
  }

  interface YTPlayer {
    playVideo(): void;
    pauseVideo(): void;
    stopVideo(): void;
    seekTo(seconds: number, allowSeekAhead?: boolean): void;
    getCurrentTime(): number;
    getDuration(): number;
    getPlayerState(): number;
    setVolume(volume: number): void;
    getVolume(): number;
    mute(): void;
    unMute(): void;
    isMuted(): boolean;
    destroy(): void;
    addEventListener(event: string, listener: (event: any) => void): void;
    removeEventListener(event: string, listener: (event: any) => void): void;
  }

  // Socket.io types
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_YOUTUBE_API_KEY?: string;
      NEXT_PUBLIC_SOCKET_URL?: string;
      NEXT_PUBLIC_BASE_URL?: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};