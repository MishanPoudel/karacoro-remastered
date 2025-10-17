"use client";

import { useEffect, useRef, useState } from 'react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  videoElement?: HTMLIFrameElement | null;
}

export function AudioVisualizer({ isPlaying }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isPlaying || !canvasRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Create audio context (we'll use a generated waveform since we can't access YouTube's audio)
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyserNode = context.createAnalyser();
    analyserNode.fftSize = 256;

    setAudioContext(context);
    setAnalyser(analyserNode);

    // Generate visual representation
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying) return;

      animationFrameRef.current = requestAnimationFrame(draw);

      // Generate dynamic data (simulated since we can't access YouTube audio)
      for (let i = 0; i < bufferLength; i++) {
        dataArray[i] = Math.random() * 255 * (isPlaying ? 1 : 0);
      }

      // Clear canvas
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height * 0.8;

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height);
        gradient.addColorStop(0, `rgba(239, 68, 68, ${dataArray[i] / 255})`);
        gradient.addColorStop(0.5, `rgba(220, 38, 38, ${dataArray[i] / 200})`);
        gradient.addColorStop(1, `rgba(124, 10, 2, ${dataArray[i] / 300})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

        // Add glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ef4444';

        x += barWidth + 1;
      }

      // Reset shadow
      ctx.shadowBlur = 0;
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (context.state !== 'closed') {
        context.close();
      }
    };
  }, [isPlaying]);

  if (!isPlaying) {
    return null;
  }

  return (
    <div className="relative w-full h-24 overflow-hidden rounded-xl bg-black/30 backdrop-blur-sm border border-red-500/20">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ imageRendering: 'crisp-edges' }}
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 to-transparent" />
    </div>
  );
}
