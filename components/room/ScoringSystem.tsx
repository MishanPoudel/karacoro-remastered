"use client";

import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Zap, Circle, Mic2 } from 'lucide-react';

interface ScoringSystemProps {
  isActive: boolean;
  username: string;
}

interface PerformanceScore {
  pitch: number;
  rhythm: number;
  completion: number;
  style: number;
  total: number;
}

export function ScoringSystem({ isActive, username }: ScoringSystemProps) {
  const [score, setScore] = useState<PerformanceScore>({
    pitch: 0,
    rhythm: 0,
    completion: 0,
    style: 0,
    total: 0,
  });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [isListening, setIsListening] = useState(false);

  // Initialize audio context for pitch detection
  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        
        analyser.fftSize = 2048;
        source.connect(analyser);
        
        audioContextRef.current = context;
        analyserRef.current = analyser;
        setIsListening(true);

        // Start scoring loop
        startScoring();
      } catch (error) {
        console.error('[Scoring] Failed to initialize audio:', error);
      }
    };

    initAudio();

    return () => {
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
      setIsListening(false);
    };
  }, [isActive]);

  const startScoring = () => {
    const scoreInterval = setInterval(() => {
      if (!isActive || !analyserRef.current) return;

      // Simulate scoring based on audio analysis
      const newPitch = Math.min(100, score.pitch + Math.random() * 5);
      const newRhythm = Math.min(100, score.rhythm + Math.random() * 4);
      const newCompletion = Math.min(100, score.completion + Math.random() * 2);
      const newStyle = Math.min(100, score.style + Math.random() * 3);

      const newTotal = Math.round((newPitch + newRhythm + newCompletion + newStyle) / 4);

      setScore({
        pitch: Math.round(newPitch),
        rhythm: Math.round(newRhythm),
        completion: Math.round(newCompletion),
        style: Math.round(newStyle),
        total: newTotal,
      });

      // Update combo
      if (newTotal > 70) {
        setCombo(prev => {
          const newCombo = prev + 1;
          setMaxCombo(Math.max(maxCombo, newCombo));
          return newCombo;
        });
      } else if (Math.random() > 0.7) {
        setCombo(0);
      }
    }, 1000);

    return () => clearInterval(scoreInterval);
  };

  const getRankDisplay = (score: number): { label: string, color: string, icon: typeof Star } => {
    if (score >= 95) return { label: 'S+', color: 'text-yellow-400', icon: Star };
    if (score >= 90) return { label: 'S', color: 'text-yellow-500', icon: Star };
    if (score >= 85) return { label: 'A+', color: 'text-blue-400', icon: Star };
    if (score >= 80) return { label: 'A', color: 'text-blue-500', icon: Star };
    if (score >= 75) return { label: 'B+', color: 'text-green-400', icon: Star };
    if (score >= 70) return { label: 'B', color: 'text-green-500', icon: Star };
    if (score >= 65) return { label: 'C+', color: 'text-purple-400', icon: Circle };
    if (score >= 60) return { label: 'C', color: 'text-purple-500', icon: Circle };
    return { label: 'D', color: 'text-gray-400', icon: Circle };
  };

  if (!isActive) return null;

  const rank = getRankDisplay(score.total);
  const RankIcon = rank.icon;

  return (
    <Card className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl border-red-500/30 shadow-2xl p-4 animate-fade-in">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic2 className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Performance Score
            </h3>
          </div>
          {isListening && (
            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 animate-pulse">
              🎤 Listening
            </Badge>
          )}
        </div>

        {/* Total Score Display */}
        <div className="text-center py-6 relative">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent rounded-2xl" />
          <div className="relative">
            <div className="flex items-center justify-center gap-3 mb-2">
              <RankIcon className={`w-8 h-8 ${rank.color}`} />
              <span className={`text-6xl font-bold ${rank.color}`}>
                {score.total}
              </span>
              <span className="text-3xl text-gray-400">/100</span>
            </div>
            <div className={`text-2xl font-bold ${rank.color} mb-1`}>
              Rank: {rank.label}
            </div>
            <div className="text-sm text-gray-400">{username}</div>
          </div>
        </div>

        {/* Combo Counter */}
        {combo > 5 && (
          <div className="text-center py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30 animate-pulse">
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="text-xl font-bold text-yellow-400">
                {combo}x COMBO!
              </span>
            </div>
            <div className="text-xs text-yellow-300 mt-1">
              Max: {maxCombo}x
            </div>
          </div>
        )}

        {/* Individual Scores */}
        <div className="grid grid-cols-2 gap-3">
          <ScoreBar label="Pitch" value={score.pitch} color="from-blue-500 to-blue-600" />
          <ScoreBar label="Rhythm" value={score.rhythm} color="from-purple-500 to-purple-600" />
          <ScoreBar label="Completion" value={score.completion} color="from-green-500 to-green-600" />
          <ScoreBar label="Style" value={score.style} color="from-pink-500 to-pink-600" />
        </div>

        {/* Tips */}
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <div className="text-xs text-gray-300">
            💡 <span className="font-semibold">Tip:</span> {getPerformanceTip(score)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs font-bold text-white">{value}%</span>
      </div>
      <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-500 ease-out`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function getPerformanceTip(score: PerformanceScore): string {
  if (score.pitch < 60) return "Try to match the pitch more closely!";
  if (score.rhythm < 60) return "Keep the beat steady!";
  if (score.completion < 60) return "Don't stop singing!";
  if (score.style < 60) return "Add more emotion to your performance!";
  if (score.total < 70) return "You're doing great! Keep practicing!";
  if (score.total < 85) return "Excellent! Try for a perfect score!";
  return "Amazing performance! You're a karaoke star! ⭐";
}
