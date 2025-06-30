"use client";

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, Music, MessageCircle, Crown, Wifi, WifiOff, Mic, MicOff, Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';
import { JoinRoomDialog } from '@/components/room/JoinRoomDialog';
import { VideoPlayer } from '@/components/room/VideoPlayer';
import { VideoQueue } from '@/components/room/VideoQueue';
import { ChatPanel } from '@/components/room/ChatPanel';
import { UserPanel } from '@/components/room/UserPanel';
import { VoiceChat, VoiceParticipant } from '@/components/room/VoiceChat';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [showJoinDialog, setShowJoinDialog] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState<VoiceParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  const {
    roomState,
    joinRoom,
    changeUsername,
    sendChatMessage,
    addToQueue,
    removeFromQueue,
    updateVideoState,
    skipVideo,
    videoEnded
  } = useSocket();

  useEffect(() => {
    if (roomState.roomId && roomState.username) {
      setHasJoined(true);
      setShowJoinDialog(false);
    }
  }, [roomState.roomId, roomState.username]);

  const handleJoinRoom = (username: string) => {
    joinRoom(roomId, username);
  };

  const handleCopyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(roomId);
      toast.success('Room ID copied to clipboard!');
    } catch {
      toast.error('Failed to copy room ID');
    }
  };

  const handleVoiceConnectionChange = (isConnected: boolean) => {
    setVoiceConnected(isConnected);
  };

  const handleVoiceParticipantsChange = (participants: VoiceParticipant[]) => {
    setVoiceParticipants(participants);
  };

  const handleVoiceMuteChange = (muted: boolean) => {
    setIsMuted(muted);
  };

  const toggleVoiceChat = () => {
    if (roomState.isDemoMode) {
      toast.info('🎭 Voice Chat Demo', {
        description: 'Voice chat is simulated in demo mode. Real voice features require a live server.',
        duration: 4000,
      });
    }
    
    setVoiceEnabled(!voiceEnabled);
    if (!voiceEnabled) {
      toast.success('Voice chat enabled');
    } else {
      toast.info('Voice chat disabled');
      setVoiceConnected(false);
      setVoiceParticipants([]);
    }
  };

  const currentUserVoice = voiceParticipants.find(p => p.id === roomState.username);
  const isCurrentUserSpeaking = currentUserVoice?.isSpeaking || false;

  if (!hasJoined) {
    return <JoinRoomDialog isOpen={showJoinDialog} roomId={roomId} onJoin={handleJoinRoom} />;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Leave Room
            </Button>
          </Link>
          
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold">Karaoke Room</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-gray-400">Room ID:</span>
              <button
                onClick={handleCopyRoomId}
                className="font-mono text-red-500 hover:text-red-400 transition-colors"
              >
                {roomId}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Demo Mode Indicator */}
            {roomState.isDemoMode && (
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Demo Mode
              </Badge>
            )}

            {/* Connection Status */}
            {roomState.connected ? (
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <Wifi className="w-4 h-4" />
                {roomState.isDemoMode ? 'Demo' : 'Connected'}
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-400 text-sm">
                <WifiOff className="w-4 h-4" />
                Disconnected
              </div>
            )}

            {/* Voice Chat Toggle */}
            <Button
              onClick={toggleVoiceChat}
              variant={voiceEnabled ? "default" : "outline"}
              size="sm"
              className={`${
                voiceEnabled 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white'
              }`}
            >
              <Volume2 className="w-4 h-4 mr-1" />
              Voice
              {voiceConnected && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {voiceParticipants.length}
                </Badge>
              )}
            </Button>

            {/* Microphone Status */}
            {voiceEnabled && voiceConnected && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                isMuted 
                  ? 'text-red-400 bg-red-500/20' 
                  : isCurrentUserSpeaking
                    ? 'text-green-300 bg-green-500/20 animate-pulse'
                    : 'text-green-400 bg-green-500/20'
              } transition-all duration-200`}>
                {isMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                <span className="text-xs">{isMuted ? 'Muted' : 'Live'}</span>
              </div>
            )}

            {/* Host Badge */}
            {roomState.isHost && (
              <div className="flex items-center gap-1 text-yellow-500 text-sm">
                <Crown className="w-4 h-4" />
                Host
              </div>
            )}
          </div>
        </div>

        {/* Voice Participants Bar */}
        {voiceEnabled && voiceConnected && voiceParticipants.length > 0 && (
          <Card className="p-3 mb-6 bg-gray-800/50 border-blue-500/30">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-blue-400">
                <Volume2 className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Voice Chat Active {roomState.isDemoMode && '(Demo)'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {voiceParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all duration-200 ${
                      participant.isSpeaking && !participant.isMuted
                        ? 'bg-green-500/20 border border-green-500/50 animate-pulse'
                        : 'bg-gray-700/50 border border-gray-600/50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      participant.isSpeaking && !participant.isMuted ? 'bg-green-400' : 'bg-gray-500'
                    }`} />
                    <span className="text-white">{participant.id}</span>
                    {participant.isMuted && (
                      <MicOff className="w-3 h-3 text-red-400" />
                    )}
                    {participant.connectionQuality && (
                      <div className={`w-2 h-2 rounded-full ${
                        participant.connectionQuality === 'good' ? 'bg-green-400' :
                        participant.connectionQuality === 'medium' ? 'bg-yellow-400' :
                        'bg-red-400'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Main Content Layout */}
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column - Video Player and Queue */}
          <div className="lg:col-span-8 space-y-6">
            <VideoPlayer
              currentVideo={roomState.currentVideo}
              videoState={roomState.videoState}
              isHost={roomState.isHost}
              onVideoStateChange={updateVideoState}
              onVideoEnd={videoEnded}
              onSkip={skipVideo}
            />

            <VideoQueue
              queue={roomState.queue}
              isHost={roomState.isHost}
              onAddToQueue={addToQueue}
              onRemoveFromQueue={removeFromQueue}
            />
          </div>

          {/* Right Sidebar - Voice Chat, Users and Chat (Desktop Only) */}
          <div className="lg:col-span-4 space-y-6 hidden lg:block">
            {voiceEnabled && roomState.connected && (
              <VoiceChat
                socket={null}
                roomId={roomId}
                userId={roomState.username}
                onConnectionStatusChange={handleVoiceConnectionChange}
                onVoiceParticipantsChange={handleVoiceParticipantsChange}
                onMuteStatusChange={handleVoiceMuteChange}
              />
            )}

            <UserPanel
              users={roomState.users}
              currentUsername={roomState.username}
              isHost={roomState.isHost}
              onChangeUsername={changeUsername}
              voiceParticipants={voiceParticipants}
            />

            <div className="h-96">
              <ChatPanel
                messages={roomState.chatHistory}
                onSendMessage={sendChatMessage}
              />
            </div>
          </div>
        </div>

        {/* Mobile-only tabs */}
        <div className="lg:hidden mt-6">
          <Tabs defaultValue="chat" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="chat">
                <MessageCircle className="w-4 h-4 mr-1" />
                Chat ({roomState.chatHistory.length})
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="w-4 h-4 mr-1" />
                Users ({roomState.users.length})
              </TabsTrigger>
              {voiceEnabled && (
                <TabsTrigger value="voice">
                  <Volume2 className="w-4 h-4 mr-1" />
                  Voice ({voiceParticipants.length})
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="chat" className="mt-4">
              <div className="h-80">
                <ChatPanel
                  messages={roomState.chatHistory}
                  onSendMessage={sendChatMessage}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="mt-4">
              <UserPanel
                users={roomState.users}
                currentUsername={roomState.username}
                isHost={roomState.isHost}
                onChangeUsername={changeUsername}
                voiceParticipants={voiceParticipants}
              />
            </TabsContent>

            {voiceEnabled && (
              <TabsContent value="voice" className="mt-4">
                <VoiceChat
                  socket={null}
                  roomId={roomId}
                  userId={roomState.username}
                  onConnectionStatusChange={handleVoiceConnectionChange}
                  onVoiceParticipantsChange={handleVoiceParticipantsChange}
                  onMuteStatusChange={handleVoiceMuteChange}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}