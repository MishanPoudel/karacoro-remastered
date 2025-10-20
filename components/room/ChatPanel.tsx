"use client";

import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Send, Crown, MessageCircle, ChevronDown, Heart } from 'lucide-react';
import { ChatMessage } from '@/hooks/useSocket';
import { formatDistanceToNow } from 'date-fns';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  currentUserId?: string;
}

// Memoized Message Component for Performance
const MessageItem = memo(({ msg, isCurrentUser }: { msg: ChatMessage; isCurrentUser: boolean }) => {
  const formatMessageTime = (timestamp: Date) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  return (
    <div className="group animate-fade-in-up">
      <div className={`flex items-start gap-2 sm:gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
        {/* Avatar with Gradient Border */}
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white relative transition-transform group-hover:scale-110 ${
            msg.isHost 
              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg shadow-yellow-500/30 ring-2 ring-yellow-500/20' 
              : isCurrentUser
              ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20'
              : 'bg-gradient-to-br from-red-400 to-red-600 shadow-lg shadow-red-500/30'
          }`}>
            {msg.username.charAt(0).toUpperCase()}
            {msg.isHost && (
              <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white absolute -top-1 -right-1 bg-yellow-600 rounded-full p-0.5 animate-pulse" />
            )}
          </div>
        </div>
        
        {/* Message Content with Better Design */}
        <div className={`flex-1 min-w-0 ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
          <div className={`flex items-center gap-1.5 sm:gap-2 mb-1 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
            <span className={`text-xs sm:text-sm font-semibold ${
              msg.isHost ? 'text-yellow-400' : isCurrentUser ? 'text-blue-400' : 'text-white'
            }`}>
              {msg.username}
              {isCurrentUser && ' (You)'}
            </span>
            <span className="text-[10px] sm:text-xs text-gray-500">
              {formatMessageTime(msg.timestamp)}
            </span>
          </div>
          <div className={`rounded-2xl px-3 py-2 sm:px-4 sm:py-2.5 max-w-[90%] sm:max-w-[85%] transition-all hover:scale-[1.02] ${
            msg.isHost 
              ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 border border-yellow-500/30 shadow-lg shadow-yellow-500/10' 
              : isCurrentUser
              ? 'bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 shadow-lg shadow-blue-500/10'
              : 'bg-gradient-to-br from-gray-700/90 to-gray-800/70 border border-gray-600/40 shadow-lg'
          }`}>
            <p className="text-xs sm:text-sm text-gray-100 break-words leading-relaxed whitespace-pre-wrap">
              {msg.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

MessageItem.displayName = 'MessageItem';

export function ChatPanel({ messages, onSendMessage, currentUserId }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  // ref to Radix viewport (the actual scrollable container)
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isUserScrollingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to bottom for new messages (only if user is at bottom)
  useEffect(() => {
  const scrollContainer = scrollAreaRef.current;
    if (!scrollContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    // Auto-scroll only if user is near bottom
    if (isAtBottom) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }, [messages]);

  // Detect if user has scrolled up
  const handleScroll = useCallback((e?: React.UIEvent<HTMLDivElement>) => {
    const scrollContainer = scrollAreaRef.current || (e && (e.target as HTMLDivElement));
    if (!scrollContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollContainer as HTMLDivElement;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

    setShowScrollButton(!isAtBottom);
    isUserScrollingRef.current = !isAtBottom;
  }, []);

  // Scroll to bottom handler
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    isUserScrollingRef.current = false;
    setShowScrollButton(false);
  }, []);

  // Optimized send message
  const handleSendMessage = useCallback(() => {
    if (!message.trim()) return;
    
    onSendMessage(message.trim());
    setMessage('');
    setIsTyping(false);
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Gentle scroll to see own message only if near bottom
    const scrollContainer = scrollAreaRef.current;
    if (scrollContainer) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer as HTMLDivElement;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
      
      if (isNearBottom) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
      }
    }
  }, [message, onSendMessage]);

  // Handle input change with typing indicator
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);
    
    if (value.trim()) {
      setIsTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to clear typing indicator
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 1000);
    } else {
      setIsTyping(false);
    }
  }, []);

  // Keyboard shortcuts
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Quick emoji reactions
  const insertEmoji = useCallback((emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  }, []);

  const quickEmojis = ['👏', '🎤', '🎵', '🔥', '❤️', '😂', '🎉', '✨'];

  return (
    <Card className="flex flex-col h-screen max-h-screen bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-red-500/30 shadow-2xl overflow-hidden">
      {/* Header with Gradient - Fixed height */}
      <div className="p-3 sm:p-4 border-b border-red-500/20 shrink-0 bg-gradient-to-r from-red-500/10 to-transparent">
        <div className="flex items-center justify-between">
          <h3 className="text-base sm:text-lg font-semibold text-white flex items-center gap-2">
            <div className="p-1 sm:p-1.5 bg-gradient-to-br from-red-500/30 to-red-600/20 rounded-lg shadow-lg shadow-red-500/20">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
            </div>
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Live Chat
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-gray-400 font-normal bg-gray-700/50 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-gray-600/30">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area with Scroll Detection - Fixed height with scrollable content */}
      <div className="flex-1 min-h-0 relative">
        <ScrollArea 
          className="h-full p-3 sm:p-4" 
          viewportRef={scrollAreaRef}
          onScroll={handleScroll}
        >
          <div className="space-y-3 sm:space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <div className="p-6 bg-gradient-to-br from-red-500/10 to-transparent rounded-2xl w-fit mx-auto mb-4">
                  <MessageCircle className="w-20 h-20 mx-auto opacity-50 text-red-400" />
                </div>
                <p className="text-lg font-semibold text-gray-300">No messages yet</p>
                <p className="text-sm text-gray-500 mt-1">Be the first to say something!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageItem 
                  key={msg.id} 
                  msg={msg} 
                  isCurrentUser={msg.userId === currentUserId}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Scroll to Bottom Button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 right-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full p-2 shadow-2xl shadow-red-500/40 hover:scale-110 transition-all z-10 animate-fade-in border border-red-400/30"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Emoji Bar - Fixed height */}
      <div className="px-3 sm:px-4 py-1.5 sm:py-2 border-t border-red-500/10 shrink-0 bg-gradient-to-r from-red-500/5 to-transparent">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 mr-1 flex-shrink-0" />
          {quickEmojis.map((emoji, index) => (
            <button
              key={index}
              onClick={() => insertEmoji(emoji)}
              className="text-base sm:text-xl hover:scale-125 transition-transform bg-gray-800/50 hover:bg-gray-700/70 rounded-lg p-1 sm:p-1.5 border border-gray-600/30 hover:border-red-500/30"
              aria-label={`Insert ${emoji} emoji`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area with Better Styling - Fixed height */}
      <div className="p-3 sm:p-4 border-t border-red-500/20 shrink-0 bg-gradient-to-r from-red-500/5 to-transparent">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Type your message..."
            value={message}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="flex-1 bg-gray-800/80 border-gray-600/50 text-white placeholder-gray-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all text-sm sm:text-base h-12"
            maxLength={500}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim()}
            aria-label="Send message"
            className="h-12 w-12 flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 transition-all duration-300 shadow-lg hover:shadow-red-500/30 hover:scale-105 rounded-xl text-white"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </div>
        <div className="text-[10px] sm:text-xs text-gray-500 mt-1.5 sm:mt-2 flex justify-between items-center">
          <span className="flex items-center gap-2">
            <span className="hidden sm:inline">Press Enter to send</span>
            <span className="sm:hidden">Enter to send</span>
            {isTyping && (
              <span className="inline-flex items-center gap-1 text-blue-400">
                <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse"></span>
                <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-1 h-1 bg-blue-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span>
              </span>
            )}
          </span>
          <span className={`transition-colors ${message.length > 450 ? 'text-yellow-400' : message.length > 480 ? 'text-red-400' : ''}`}>
            {message.length}/500
          </span>
        </div>
      </div>
    </Card>
  );
}