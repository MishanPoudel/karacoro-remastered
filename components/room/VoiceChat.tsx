"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Mic, MicOff, Volume2, VolumeX, User, X, Wifi, Users, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceChatProps {
  socket: any;
  roomId: string;
  userId: string;
  username: string;
}

interface VoiceParticipant {
  id: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  connectionQuality: 'good' | 'medium' | 'poor';
}

export function VoiceChat({ socket, roomId, userId, username }: VoiceChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
  const [userVolumes, setUserVolumes] = useState<Map<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('voiceChat_userVolumes');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return new Map(Object.entries(parsed));
        } catch (e) {
          console.error('Failed to parse saved volumes:', e);
        }
      }
    }
    return new Map();
  });
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(new Map());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const volumesObj = Object.fromEntries(userVolumes);
      localStorage.setItem('voiceChat_userVolumes', JSON.stringify(volumesObj));
    }
  }, [userVolumes]);

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
    iceCandidatePoolSize: 10,
  };

  const createPeerConnection = useCallback((targetUserId: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice_ice_candidate', {
          roomId,
          targetUserId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      let audioElement = audioElementsRef.current.get(targetUserId);
      
      if (!audioElement) {
        audioElement = new Audio();
        audioElement.autoplay = true;
        const savedVolume = userVolumes.get(targetUserId) ?? 100;
        audioElement.volume = isDeafened ? 0 : savedVolume / 100;
        audioElementsRef.current.set(targetUserId, audioElement);
      }
      
      audioElement.srcObject = remoteStream;
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        handlePeerDisconnect(targetUserId);
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    peerConnectionsRef.current.set(targetUserId, pc);
    return pc;
  }, [socket, roomId, isDeafened]);

  const handlePeerDisconnect = (targetUserId: string) => {
    const pc = peerConnectionsRef.current.get(targetUserId);
    if (pc) {
      pc.close();
      peerConnectionsRef.current.delete(targetUserId);
    }
    
    const audioElement = audioElementsRef.current.get(targetUserId);
    if (audioElement) {
      audioElement.srcObject = null;
      audioElementsRef.current.delete(targetUserId);
    }
  };

  const connectToVoice = async () => {
    try {
      console.log('[VOICE CLIENT] Starting connection process...');
      console.log('[VOICE CLIENT] Current socket:', socket ? 'Connected' : 'Not connected');
      console.log('[VOICE CLIENT] Parameters:', { userId, roomId, username });
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      console.log('[VOICE CLIENT] Got audio stream');
      
      localStreamRef.current = stream;
      stream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      
      console.log('\\n🎤 [VOICE CLIENT] ========================================');
      console.log('🎤 [VOICE CLIENT] Attempting to join voice chat');
      console.log('🎤 [VOICE CLIENT] Socket object exists?:', !!socket);
      console.log('🎤 [VOICE CLIENT] Socket connected?:', socket?.connected);
      console.log('🎤 [VOICE CLIENT] Socket ID:', socket?.id);
      console.log('🎤 [VOICE CLIENT] Room ID:', roomId);
      console.log('🎤 [VOICE CLIENT] User ID:', userId);
      console.log('🎤 [VOICE CLIENT] Username:', username);
      console.log('🎤 [VOICE CLIENT] ========================================\\n');
      
      if (!socket) {
        console.error('❌ [VOICE CLIENT] ERROR: Socket object is null/undefined!');
        toast.error('Connection error: Socket not initialized');
        return;
      }
      
      if (!socket.connected) {
        console.error('❌ [VOICE CLIENT] ERROR: Socket not connected to server!');
        toast.error('Not connected to server. Please refresh the page.');
        return;
      }
      
      console.log('✅ [VOICE CLIENT] Socket is valid and connected, emitting voice_join...');
      socket.emit('voice_join', { roomId, userId });
      
      console.log('✅ [VOICE CLIENT] voice_join event emitted successfully');
      console.log('⏳ [VOICE CLIENT] Waiting for voice_user_joined response from server...');
      
      setIsConnected(true);
      setIsMuted(true);
      toast.success('Connected to voice chat');
    } catch (error) {
      console.error('[VOICE CLIENT] Failed to get audio stream:', error);
      toast.error('Failed to access microphone');
    }
  };

  const disconnectFromVoice = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();

    audioElementsRef.current.forEach((audio) => {
      audio.srcObject = null;
    });
    audioElementsRef.current.clear();

    socket.emit('voice_leave', { roomId, userId });
    setIsConnected(false);
    setParticipants([]);
    toast.info('Disconnected from voice chat');
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      const newMutedState = !isMuted;
      audioTrack.enabled = !newMutedState;
      setIsMuted(newMutedState);
      
      // Update local participants state immediately for instant UI feedback
      setParticipants((prev) =>
        prev.map((p) => (p.id === userId ? { ...p, isMuted: newMutedState } : p))
      );
      
      socket.emit('voice_toggle_mute', { roomId, userId, isMuted: newMutedState });
      toast.info(newMutedState ? 'Microphone muted' : 'Microphone unmuted');
    }
  };

  const handleVolumeChange = (targetUserId: string, volume: number) => {
    setUserVolumes(prev => new Map(prev.set(targetUserId, volume)));
    
    const audioElement = audioElementsRef.current.get(targetUserId);
    if (audioElement && !isDeafened) {
      audioElement.volume = volume / 100;
    }
  };

  const toggleDeafen = () => {
    const newDeafenState = !isDeafened;
    setIsDeafened(newDeafenState);
    
    audioElementsRef.current.forEach((audio, targetUserId) => {
      if (newDeafenState) {
        audio.volume = 0;
      } else {
        const savedVolume = userVolumes.get(targetUserId) ?? 100;
        audio.volume = savedVolume / 100;
      }
    });

    if (newDeafenState && !isMuted) {
      toggleMute();
    }
    
    toast.info(newDeafenState ? 'Audio output disabled' : 'Audio output enabled');
  };

  useEffect(() => {
    if (!socket) return;

    socket.on('voice_user_joined', ({ userId: joinedUserId, username: joinedUsername, participants: updatedParticipants }) => {
      console.log('\\n✅ [VOICE CLIENT] ========================================');
      console.log('✅ [VOICE CLIENT] Received voice_user_joined event!');
      console.log('✅ [VOICE CLIENT] Joined user ID:', joinedUserId);
      console.log('✅ [VOICE CLIENT] Joined username:', joinedUsername);
      console.log('✅ [VOICE CLIENT] My user ID:', userId);
      console.log('✅ [VOICE CLIENT] Participants count:', updatedParticipants?.length);
      console.log('✅ [VOICE CLIENT] Full participants:', JSON.stringify(updatedParticipants, null, 2));
      console.log('✅ [VOICE CLIENT] Am I connected?:', isConnected);
      console.log('✅ [VOICE CLIENT] ========================================\\n');
      setParticipants(updatedParticipants);
      
      if (isConnected && joinedUserId !== userId) {
        const pc = createPeerConnection(joinedUserId);
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => {
            socket.emit('voice_offer', {
              roomId,
              targetUserId: joinedUserId,
              offer: pc.localDescription,
            });
          });
      }
    });

    socket.on('voice_user_left', ({ userId: leftUserId, participants: updatedParticipants }) => {
      handlePeerDisconnect(leftUserId);
      setParticipants(updatedParticipants);
    });

    socket.on('voice_offer', async ({ fromUserId, offer }) => {
      const pc = createPeerConnection(fromUserId);
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socket.emit('voice_answer', {
        roomId,
        targetUserId: fromUserId,
        answer: pc.localDescription,
      });

      const pendingCandidates = pendingCandidatesRef.current.get(fromUserId) || [];
      for (const candidate of pendingCandidates) {
        await pc.addIceCandidate(candidate);
      }
      pendingCandidatesRef.current.delete(fromUserId);
    });

    socket.on('voice_answer', async ({ fromUserId, answer }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        
        const pendingCandidates = pendingCandidatesRef.current.get(fromUserId) || [];
        for (const candidate of pendingCandidates) {
          await pc.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current.delete(fromUserId);
      }
    });

    socket.on('voice_ice_candidate', async ({ fromUserId, candidate }) => {
      const pc = peerConnectionsRef.current.get(fromUserId);
      if (pc && pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        const pending = pendingCandidatesRef.current.get(fromUserId) || [];
        pending.push(new RTCIceCandidate(candidate));
        pendingCandidatesRef.current.set(fromUserId, pending);
      }
    });

    socket.on('voice_mute_status', ({ userId: mutedUserId, isMuted: muted }) => {
      setParticipants((prev) =>
        prev.map((p) => (p.id === mutedUserId ? { ...p, isMuted: muted } : p))
      );
    });

    socket.on('error', (error) => {
      console.error('\\n❌ [VOICE CLIENT] ========================================');
      console.error('❌ [VOICE CLIENT] Received error from server!');
      console.error('❌ [VOICE CLIENT] Error:', error);
      console.error('❌ [VOICE CLIENT] ========================================\\n');
      toast.error(error.message || 'Voice chat error');
    });

    return () => {
      socket.off('voice_user_joined');
      socket.off('voice_user_left');
      socket.off('voice_offer');
      socket.off('voice_answer');
      socket.off('voice_ice_candidate');
      socket.off('voice_mute_status');
      socket.off('error');
    };
  }, [socket, roomId, userId, isConnected, createPeerConnection]);

  useEffect(() => {
    return () => {
      if (isConnected) {
        disconnectFromVoice();
      }
    };
  }, []);

  return (
    <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-red-500/30 shadow-xl">
      <div className="p-4 border-b border-red-500/20 bg-gradient-to-r from-red-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/20">
              <Users className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Voice Chat</h3>
              <p className="text-xs text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-red-500/20 text-red-400 border-red-500/30">
            {participants.length} {participants.length === 1 ? 'person' : 'people'}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isConnected && participants.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {participants.map((participant) => {
              const isMe = participant.id === userId;
              const isExpanded = expandedUserId === participant.id;
              return (
                <div
                  key={participant.id}
                  className={`rounded-lg transition-all duration-200 ${
                    isMe 
                      ? 'bg-red-500/20 border border-red-500/40 shadow-sm' 
                      : 'bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="relative">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                        isMe ? 'bg-red-500' : 'bg-gradient-to-br from-gray-600 to-gray-700'
                      }`}>
                        {participant.username.charAt(0).toUpperCase()}
                      </div>
                      {participant.isSpeaking && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white truncate">
                          {participant.username}
                        </span>
                        {isMe && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-red-500/50 text-red-400">
                            You
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Wifi className={`w-3 h-3 ${
                          participant.connectionQuality === 'good' ? 'text-green-400' :
                          participant.connectionQuality === 'medium' ? 'text-yellow-400' :
                          'text-red-400'
                        }`} />
                        <span className="text-[10px] text-gray-500">
                          {participant.connectionQuality}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        participant.isMuted 
                          ? 'bg-red-500/20 text-red-400' 
                          : 'bg-green-500/20 text-green-400'
                      }`}>
                        {participant.isMuted ? (
                          <MicOff className="w-4 h-4" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                      </div>
                      
                      {!isMe && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 hover:bg-gray-700/50 transition-colors ${
                            isExpanded ? 'text-red-400 hover:text-red-300' : 'text-gray-400 hover:text-white'
                          }`}
                          onClick={() => setExpandedUserId(isExpanded ? null : participant.id)}
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {!isMe && isExpanded && (
                    <div className="px-4 pb-3 space-y-2 border-t border-gray-700/50">
                      <div className="flex items-center justify-between text-xs pt-3">
                        <span className="text-gray-400">Volume</span>
                        <span className="font-medium text-red-400">{userVolumes.get(participant.id) ?? 100}%</span>
                      </div>
                      <Slider
                        value={[userVolumes.get(participant.id) ?? 100]}
                        onValueChange={([value]) => handleVolumeChange(participant.id, value)}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isConnected && participants.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Waiting for others to join...</p>
          </div>
        )}

        <div className="space-y-2">
          {!isConnected ? (
            <Button
              onClick={connectToVoice}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold shadow-lg hover:shadow-green-500/25 transition-all duration-200"
              size="lg"
            >
              <User className="w-5 h-5 mr-2" />
              Join Voice Channel
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={toggleMute}
                  className={`font-medium transition-all duration-200 ${
                    isMuted
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25'
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-green-500/25'
                  }`}
                  disabled={isDeafened}
                  size="lg"
                >
                  {isMuted ? (
                    <>
                      <MicOff className="w-5 h-5 mr-2" />
                      Muted
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5 mr-2" />
                      Unmuted
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={toggleDeafen}
                  className={`font-medium transition-all duration-200 ${
                    isDeafened
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-red-500/25'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                  size="lg"
                >
                  {isDeafened ? (
                    <>
                      <VolumeX className="w-5 h-5 mr-2" />
                      Deafened
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-5 h-5 mr-2" />
                      Audio
                    </>
                  )}
                </Button>
              </div>
              
              <Button
                onClick={disconnectFromVoice}
                variant="outline"
                className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                size="lg"
              >
                <X className="w-5 h-5 mr-2" />
                Leave Voice
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
