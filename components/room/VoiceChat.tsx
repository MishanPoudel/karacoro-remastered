"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Mic, MicOff, Volume2, VolumeX, Users, Wifi, WifiOff, AlertTriangle, Settings, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { envLog } from '@/lib/config';

// Define VoiceParticipant interface locally to avoid import issues
export interface VoiceParticipant {
  id: string;
  isMuted: boolean;
  isSpeaking?: boolean;
  connectionQuality?: 'good' | 'medium' | 'poor';
  volume?: number;
  userVolume?: number; // Individual volume control
}

export interface VoiceChatProps {
  socket: any; // Use any to avoid Socket.io import issues
  roomId: string;
  userId: string;
  onConnectionStatusChange?: (isConnected: boolean) => void;
  onVoiceParticipantsChange?: (participants: VoiceParticipant[]) => void;
  onMuteStatusChange?: (isMuted: boolean) => void;
}

// Free STUN servers for NAT traversal
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun.stunprotocol.org:3478' }
];

export function VoiceChat({ 
  socket, 
  roomId, 
  userId,
  onConnectionStatusChange,
  onVoiceParticipantsChange,
  onMuteStatusChange
}: VoiceChatProps) {
  // Core state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [masterVolume, setMasterVolume] = useState(80);
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // WebRTC state
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const socketRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const voiceActivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);

  // Update socket ref when socket changes
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Check if we're in demo mode
  useEffect(() => {
    const checkDemoMode = () => {
      if (typeof window !== 'undefined') {
        const globalSocket = (window as any).__KARAOKE_SOCKET__;
        if (globalSocket && 'id' in globalSocket && globalSocket.id.includes('mock')) {
          setIsDemoMode(true);
        }
      }
    };
    
    checkDemoMode();
  }, []);

  // Get current socket (either from prop or from global state)
  const getCurrentSocket = useCallback(() => {
    if (socketRef.current) return socketRef.current;
    
    // Try to get socket from global state if available
    if (typeof window !== 'undefined' && (window as any).__KARAOKE_SOCKET__) {
      return (window as any).__KARAOKE_SOCKET__;
    }
    
    return null;
  }, []);

  // Check microphone permission
  const checkMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
    } catch {
      setHasPermission(false);
    }
  };

  // Request microphone access (or simulate in demo mode)
  const requestMicrophoneAccess = async (): Promise<MediaStream> => {
    if (isDemoMode) {
      // Create a fake audio stream for demo mode
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const destination = audioContext.createMediaStreamDestination();
      oscillator.connect(destination);
      oscillator.start();
      
      envLog.info('Demo microphone access granted');
      return destination.stream;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        },
        video: false
      });

      // Start muted
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
      }

      envLog.info('Microphone access granted');
      return stream;
    } catch (error) {
      envLog.error('Failed to access microphone:', error);
      throw new Error('Microphone access denied. Please allow microphone access to use voice chat.');
    }
  };

  // Setup audio analysis for voice activity detection
  const setupAudioAnalysis = (stream: MediaStream) => {
    if (isDemoMode) {
      // Simulate voice activity in demo mode
      startDemoVoiceActivity();
      return;
    }

    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      
      analyserRef.current.fftSize = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      
      source.connect(analyserRef.current);

      // Start voice activity detection
      startVoiceActivityDetection();
    } catch (error) {
      envLog.error('Failed to setup audio analysis:', error);
    }
  };

  // Demo voice activity simulation
  const startDemoVoiceActivity = () => {
    voiceActivityTimerRef.current = setInterval(() => {
      if (isMuted) return;

      // Simulate random voice activity
      const isSpeaking = Math.random() > 0.8;
      const volume = isSpeaking ? Math.random() * 50 + 20 : 0;

      // Update local participant and notify others
      const currentSocket = getCurrentSocket();
      if (currentSocket) {
        currentSocket.emit('voice_activity', {
          roomId,
          userId,
          isSpeaking,
          volume
        });
      }

      // Update local state
      setParticipants(prev => prev.map(p => 
        p.id === userId 
          ? { ...p, isSpeaking, volume }
          : p
      ));
    }, 500);
  };

  // Voice activity detection
  const startVoiceActivityDetection = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const voiceActivityThreshold = 30;

    const detectVoiceActivity = () => {
      if (!analyserRef.current || isMuted) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const isSpeaking = average > voiceActivityThreshold;

      // Update local participant and notify others
      const currentSocket = getCurrentSocket();
      if (currentSocket) {
        currentSocket.emit('voice_activity', {
          roomId,
          userId,
          isSpeaking,
          volume: average
        });
      }

      // Update local state
      setParticipants(prev => prev.map(p => 
        p.id === userId 
          ? { ...p, isSpeaking, volume: average }
          : p
      ));
    };

    voiceActivityTimerRef.current = setInterval(detectVoiceActivity, 100);
  };

  // Create peer connection (or simulate in demo mode)
  const createPeerConnection = async (peerId: string, isInitiator: boolean): Promise<RTCPeerConnection | null> => {
    if (isDemoMode) {
      // Return null for demo mode - no real peer connections
      return null;
    }

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10
    });

    // Add local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      handleRemoteStream(peerId, remoteStream);
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const currentSocket = getCurrentSocket();
        if (currentSocket) {
          currentSocket.emit('voice_ice_candidate', {
            targetUserId: peerId,
            candidate: event.candidate.toJSON()
          });
        }
      }
    };

    // Monitor connection state
    pc.onconnectionstatechange = () => {
      envLog.debug(`Connection state with ${peerId}:`, pc.connectionState);
      updateConnectionQuality(peerId, pc);
    };

    peerConnectionsRef.current.set(peerId, pc);

    // If we're the initiator, create and send offer
    if (isInitiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      const currentSocket = getCurrentSocket();
      if (currentSocket) {
        currentSocket.emit('voice_offer', {
          targetUserId: peerId,
          offer: offer
        });
      }
    }

    envLog.info(`Peer connection created with ${peerId}`);
    return pc;
  };

  // Handle remote stream
  const handleRemoteStream = (peerId: string, stream: MediaStream) => {
    // Create or update audio element for this peer
    let audioElement = document.querySelector(`audio[data-participant="${peerId}"]`) as HTMLAudioElement;
    
    if (!audioElement) {
      audioElement = document.createElement('audio');
      audioElement.setAttribute('data-participant', peerId);
      audioElement.autoplay = true;
      audioElement.style.display = 'none';
      
      // Set initial volume based on participant's individual volume or master volume
      const participant = participants.find(p => p.id === peerId);
      const volume = participant?.userVolume ?? masterVolume;
      audioElement.volume = volume / 100;
      
      document.body.appendChild(audioElement);
    }

    audioElement.srcObject = stream;
    envLog.info(`Remote stream connected for ${peerId}`);
  };

  // Update connection quality
  const updateConnectionQuality = (peerId: string, pc: RTCPeerConnection) => {
    let quality: 'good' | 'medium' | 'poor' = 'good';
    
    switch (pc.connectionState) {
      case 'connected':
        quality = 'good';
        break;
      case 'connecting':
        quality = 'medium';
        break;
      case 'disconnected':
      case 'failed':
        quality = 'poor';
        break;
    }

    setParticipants(prev => prev.map(p => 
      p.id === peerId 
        ? { ...p, connectionQuality: quality }
        : p
    ));
  };

  // Connect to voice chat
  const connectToVoiceChat = async () => {
    if (isConnected || isConnecting) return;

    setIsConnecting(true);
    setError(null);

    try {
      envLog.info('Connecting to voice chat...');
      
      if (isDemoMode) {
        toast.info('🎭 Demo Voice Chat', {
          description: 'Voice chat is simulated in demo mode',
          duration: 3000,
        });
      }
      
      // Request microphone access
      const stream = await requestMicrophoneAccess();
      localStreamRef.current = stream;
      
      // Setup audio analysis
      setupAudioAnalysis(stream);
      
      // Add self as participant
      setParticipants(prev => {
        if (prev.find(p => p.id === userId)) return prev;
        return [...prev, {
          id: userId,
          isMuted: true,
          isSpeaking: false,
          connectionQuality: 'good',
          volume: 0,
          userVolume: masterVolume
        }];
      });

      // Add some demo participants if in demo mode
      if (isDemoMode) {
        setTimeout(() => {
          setParticipants(prev => [
            ...prev,
            {
              id: 'DemoUser1',
              isMuted: false,
              isSpeaking: false,
              connectionQuality: 'good',
              volume: 0,
              userVolume: masterVolume
            },
            {
              id: 'DemoUser2',
              isMuted: true,
              isSpeaking: false,
              connectionQuality: 'medium',
              volume: 0,
              userVolume: masterVolume
            }
          ]);
        }, 1000);
      }
      
      // Join voice room
      const currentSocket = getCurrentSocket();
      if (currentSocket) {
        currentSocket.emit('voice_join', {
          roomId,
          userId
        });
      }

      setIsConnected(true);
      setIsConnecting(false);
      onConnectionStatusChange?.(true);
      
      const message = isDemoMode 
        ? 'Connected to demo voice chat!' 
        : 'Connected to voice chat!';
      toast.success(message);
      envLog.info('Voice chat connected successfully');
    } catch (error) {
      envLog.error('Failed to connect to voice chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to voice chat';
      setError(errorMessage);
      setIsConnecting(false);
      toast.error(errorMessage);
    }
  };

  // Disconnect from voice chat
  const disconnectFromVoiceChat = async () => {
    if (!isConnected) return;

    try {
      envLog.info('Disconnecting from voice chat...');
      
      // Stop voice activity detection
      if (voiceActivityTimerRef.current) {
        clearInterval(voiceActivityTimerRef.current);
        voiceActivityTimerRef.current = null;
      }

      // Close all peer connections safely
      for (const [peerId, pc] of Array.from(peerConnectionsRef.current.entries())) {
        try {
          pc.close();
          envLog.info(`Successfully closed peer connection for ${peerId}`);
        } catch (error) {
          envLog.warn(`Error closing peer connection for ${peerId}:`, error);
        }
      }

      // Clear the peer connections map
      peerConnectionsRef.current.clear();
      envLog.info("Cleared all peer connections.");


      // Stop local stream
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (error) {
            envLog.warn('Error stopping track:', error);
          }
        });
        localStreamRef.current = null;
      }

      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          await audioContextRef.current.close();
        } catch (error) {
          envLog.warn('Error closing audio context:', error);
        }
        audioContextRef.current = null;
        analyserRef.current = null;
      }

      // Remove all audio elements
      const audioElements = document.querySelectorAll('audio[data-participant]');
      audioElements.forEach(element => element.remove());

      // Leave voice room
      const currentSocket = getCurrentSocket();
      if (currentSocket) {
        currentSocket.emit('voice_leave', {
          roomId,
          userId
        });
      }

      setIsConnected(false);
      setParticipants([]);
      
      onConnectionStatusChange?.(false);
      onVoiceParticipantsChange?.([]);
      
      const message = isDemoMode 
        ? 'Disconnected from demo voice chat' 
        : 'Disconnected from voice chat';
      toast.info(message);
      envLog.info('Voice chat disconnected');
    } catch (error) {
      envLog.error('Error disconnecting from voice chat:', error);
    }
  };

  // Toggle mute/unmute
  const toggleMute = () => {
    if (!localStreamRef.current || !isConnected) {
      toast.warning('Not connected to voice chat');
      return;
    }

    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    if (!isDemoMode) {
      // Mute/unmute local audio track
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !newMutedState;
      }
    }

    // Update local participant
    setParticipants(prev => prev.map(p => 
      p.id === userId 
        ? { ...p, isMuted: newMutedState, isSpeaking: false }
        : p
    ));

    // Notify other participants
    const currentSocket = getCurrentSocket();
    if (currentSocket) {
      currentSocket.emit('voice_mute_status', {
        roomId,
        userId,
        isMuted: newMutedState
      });
    }

    onMuteStatusChange?.(newMutedState);
    
    envLog.info(`Microphone ${newMutedState ? 'muted' : 'unmuted'}`);
  };

  // Set volume for a specific participant
  const setParticipantVolume = (participantId: string, volume: number) => {
    if (isDemoMode) {
      // Just update state in demo mode
      setParticipants(prev => prev.map(p => 
        p.id === participantId 
          ? { ...p, userVolume: volume }
          : p
      ));
      return;
    }

    const audioElements = document.querySelectorAll(`audio[data-participant="${participantId}"]`);
    audioElements.forEach((audio) => {
      (audio as HTMLAudioElement).volume = Math.max(0, Math.min(1, volume / 100));
    });

    // Update participant's individual volume
    setParticipants(prev => prev.map(p => 
      p.id === participantId 
        ? { ...p, userVolume: volume }
        : p
    ));
  };

  // Handle master volume changes
  const handleMasterVolumeChange = (newVolume: number[]) => {
    const volume = newVolume[0];
    setMasterVolume(volume);
    
    // Apply to all participants who don't have individual volume set
    participants.forEach(participant => {
      if (participant.id !== userId && participant.userVolume === undefined) {
        setParticipantVolume(participant.id, volume);
      }
    });
  };

  // Initialize
  useEffect(() => {
    if (roomId && userId) {
      checkMicrophonePermission();
    }

    return () => {
      disconnectFromVoiceChat();
    };
  }, [roomId, userId]);

  // Update participants callback
  useEffect(() => {
    onVoiceParticipantsChange?.(participants);
  }, [participants, onVoiceParticipantsChange]);

  // Get connection quality color
  const getConnectionQualityColor = (quality?: 'good' | 'medium' | 'poor') => {
    switch (quality) {
      case 'good': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  // Get speaking indicator
  const getSpeakingIndicator = (participant: VoiceParticipant) => {
    if (participant.isSpeaking && !participant.isMuted) {
      return (
        <div className="flex items-center gap-1">
          <div className="w-1 h-3 bg-green-400 rounded animate-pulse" />
          <div className="w-1 h-4 bg-green-400 rounded animate-pulse" style={{ animationDelay: '0.1s' }} />
          <div className="w-1 h-2 bg-green-400 rounded animate-pulse" style={{ animationDelay: '0.2s' }} />
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 bg-gray-800/50 border-blue-500/30">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Voice Chat</h3>
            {isDemoMode && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 text-xs">
                Demo
              </Badge>
            )}
            {isConnected && (
              <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                <Wifi className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            )}
            {isConnecting && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Connecting
              </Badge>
            )}
            {error && (
              <Badge variant="secondary" className="bg-red-500/20 text-red-400">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Error
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Permission Check */}
        {!hasPermission && !isDemoMode && (
          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3">
            <p className="text-yellow-300 text-sm">
              Microphone permission is required for voice chat. Please allow microphone access when prompted.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-300 text-sm">{error}</p>
            <Button
              onClick={() => {
                setError(null);
                connectToVoiceChat();
              }}
              size="sm"
              className="mt-2 bg-red-600 hover:bg-red-700"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Connection Controls */}
        {!isConnected ? (
          <div className="text-center py-4">
            <p className="text-gray-400 mb-4">
              {isConnecting ? 'Connecting to voice chat...' : 
               isDemoMode ? 'Join demo voice chat to simulate talking with other participants' :
               'Join voice chat to talk with other participants'}
            </p>
            <Button
              onClick={connectToVoiceChat}
              disabled={isConnecting || (!getCurrentSocket() && !isDemoMode) || (!hasPermission && !isDemoMode)}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Join Voice Chat {isDemoMode && '(Demo)'}
                </>
              )}
            </Button>
            {!hasPermission && !isDemoMode && (
              <p className="text-xs text-gray-500 mt-2">
                Microphone permission required
              </p>
            )}
          </div>
        ) : (
          <>
            {/* Voice Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  onClick={toggleMute}
                  variant={isMuted ? "outline" : "default"}
                  size="sm"
                  className={`${
                    isMuted 
                      ? 'border-red-500 text-red-400 hover:bg-red-500 hover:text-white' 
                      : 'bg-green-600 hover:bg-green-700'
                  } transition-all duration-200`}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                
                <span className="text-sm text-gray-400">
                  {isMuted ? 'Muted' : 'Unmuted'} {isDemoMode && '(Demo)'}
                </span>
              </div>

              <Button
                onClick={disconnectFromVoiceChat}
                variant="outline"
                size="sm"
                className="border-red-500 text-red-400 hover:bg-red-500 hover:text-white"
              >
                Leave Voice
              </Button>
            </div>

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-gray-700/50 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Master Volume
                  </label>
                  <div className="flex items-center gap-3">
                    <VolumeX className="w-4 h-4 text-gray-400" />
                    <Slider
                      value={[masterVolume]}
                      onValueChange={handleMasterVolumeChange}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <Volume2 className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400 w-8">{masterVolume}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Participants List */}
            {participants.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-300">
                  Participants ({participants.length}) {isDemoMode && '(Demo)'}
                </h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className={`flex items-center justify-between p-2 rounded-lg transition-all duration-200 ${
                        participant.isSpeaking && !participant.isMuted
                          ? 'bg-green-500/20 border border-green-500/50'
                          : 'bg-gray-700/30'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full ${
                          participant.connectionQuality === 'good' ? 'bg-green-400' :
                          participant.connectionQuality === 'medium' ? 'bg-yellow-400' :
                          'bg-red-400'
                        }`} />
                        
                        <span className="text-sm text-white truncate">
                          {participant.id}
                          {participant.id === userId && ' (You)'}
                        </span>
                        
                        {participant.isMuted ? (
                          <MicOff className="w-3 h-3 text-red-400 flex-shrink-0" />
                        ) : (
                          <Mic className="w-3 h-3 text-green-400 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {getSpeakingIndicator(participant)}
                        
                        {/* Individual volume control for other participants */}
                        {participant.id !== userId && (
                          <div className="flex items-center gap-1">
                            <VolumeX className="w-3 h-3 text-gray-400" />
                            <Slider
                              value={[participant.userVolume ?? masterVolume]}
                              onValueChange={(value) => setParticipantVolume(participant.id, value[0])}
                              max={100}
                              step={1}
                              className="w-16"
                            />
                            <Volume2 className="w-3 h-3 text-gray-400" />
                          </div>
                        )}
                        
                        <span className={`text-xs ${getConnectionQualityColor(participant.connectionQuality)}`}>
                          {participant.connectionQuality}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Voice Chat Info */}
            <div className="text-xs text-gray-400 text-center pt-2 border-t border-gray-700">
              {isDemoMode 
                ? 'Demo mode - simulated voice communication'
                : 'Using WebRTC for peer-to-peer voice communication'
              }
            </div>
          </>
        )}
      </div>
    </Card>
  );
}