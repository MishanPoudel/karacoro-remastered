"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const KaraokeNotFoundPage = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [activeNotes, setActiveNotes] = useState<
    { id: number; symbol: string; left: number; size: number; duration: number }[]
  >([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const starsRef = useRef<any[]>([]);
  const noteIdRef = useRef(0);

  // === Stars ===
  const initStars = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    ctx.scale(dpr, dpr);

    const count = Math.min(
      120,
      Math.floor(window.innerWidth * window.innerHeight / 8000)
    );

    starsRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.7 + 0.3,
      twinkleSpeed: Math.random() * 0.04 + 0.01,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  const animateStars = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    starsRef.current.forEach((star) => {
      const twinkle =
        Math.sin(time * star.twinkleSpeed + star.phase) * 0.4 + 0.6;
      ctx.fillStyle = `rgba(255,255,255,${star.opacity * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    animationIdRef.current = requestAnimationFrame(animateStars);
  }, []);

  // === Floating Music Notes ===
  const createNote = useCallback(() => {
    const symbols = ["♪", "♫", "♬", "♩", "♭", "♯", "♮"];
    const note = {
      id: noteIdRef.current++,
      symbol: symbols[Math.floor(Math.random() * symbols.length)],
      left: Math.random() * 90 + 5,
      size: Math.random() * 1 + 1.5,
      duration: Math.random() * 3 + 5,
    };

    setActiveNotes((prev) => [...prev.slice(-7), note]);
    setTimeout(
      () => setActiveNotes((prev) => prev.filter((n) => n.id !== note.id)),
      note.duration * 1000
    );
  }, []);

  // === Search handler ===
  const handleSearch = async () => {
    setIsSearching(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsSearching(false);
    console.log("Redirecting to search page...");
  };

  // === Effects ===
  useEffect(() => {
    initStars();
    animationIdRef.current = requestAnimationFrame(animateStars);
    const noteInterval = setInterval(createNote, 2000);

    const handleResize = () => initStars();
    const handleVisibility = () => {
      if (document.hidden && animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      } else if (!document.hidden) {
        animationIdRef.current = requestAnimationFrame(animateStars);
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
      clearInterval(noteInterval);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [initStars, animateStars, createNote]);

  const buttonClasses = {
    base: "relative px-10 py-4 text-lg font-semibold rounded-full transition-all duration-300 ease-out overflow-hidden border-2 min-w-[200px] backdrop-blur-xl focus:outline-none focus:ring-2 focus:ring-pink-400",
    primary:
      "bg-gradient-to-r from-red-500 to-pink-600 text-white border-transparent shadow-lg shadow-red-500/40 hover:shadow-red-500/70 hover:-translate-y-1 hover:scale-105",
    secondary:
      "bg-white/10 text-white border-white/20 shadow-lg shadow-black/30 hover:bg-white/20 hover:border-white/40",
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      {/* Ambient overlays */}
      <div className="fixed inset-0 pointer-events-none z-[2]">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-red-500/10 via-transparent"></div>
        <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-cyan-500/10 via-transparent"></div>
        <div className="absolute top-1/2 left-1/2 w-full h-full bg-gradient-to-r from-pink-500/5 via-transparent -translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Stars */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-[1]"
      />

      {/* Floating Notes */}
      <div className="fixed inset-0 pointer-events-none z-[5]">
        {activeNotes.map((note) => (
          <div
            key={note.id}
            aria-hidden
            className="absolute text-white/70"
            style={{
              left: `${note.left}%`,
              fontSize: `${note.size}rem`,
              animation: `floatUp ${note.duration}s linear forwards`,
            }}
          >
            {note.symbol}
          </div>
        ))}
      </div>

      {/* Now playing */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-full px-6 py-3 shadow-lg">
          <span className="text-white/80 font-semibold text-sm">♪ Now playing: 404 Not Found ♪</span>
        </div>
      </div>

      {/* Main */}
      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center text-center px-4 gap-8">
        {/* Mic */}
        <div className="relative mb-8">
          <div className="w-28 h-40 relative animate-bounce-slow cursor-pointer hover:scale-105 transition-transform">
            <div className="w-20 h-24 bg-gradient-to-br from-red-500 to-pink-600 rounded-t-[40px] mx-auto shadow-2xl relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent rounded-t-[40px]" />
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-14 h-14 flex flex-col justify-around">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-full h-0.5 bg-gradient-to-r from-transparent via-white/80 to-transparent rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
            <div className="w-8 h-16 bg-gradient-to-b from-gray-600 to-gray-800 mx-auto rounded-b-xl shadow-xl relative">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-5 h-5 bg-gradient-to-b from-white/20 to-transparent rounded-b-xl" />
            </div>
          </div>
        </div>

        {/* Error */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <h1 className="text-8xl md:text-9xl font-black bg-gradient-to-r from-red-500 via-pink-600 to-white bg-clip-text text-transparent animate-pulse drop-shadow-[0_0_30px_rgba(255,48,64,0.8)]">
            404
          </h1>
          <h2 className="text-3xl md:text-4xl font-bold">Song Not Found</h2>
          <p className="text-lg md:text-xl text-white/80 max-w-md">
            Looks like this track isn’t in our karaoke playlist. Let’s take you
            back to the main stage.
          </p>
        </div>

        {/* Buttons */}
        <nav className="flex flex-col md:flex-row gap-6">
          <a
            href="/"
            aria-label="Go back to main room"
            className={`${buttonClasses.base} ${buttonClasses.primary} group`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              🏠 Back to Main Room
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          </a>
        </nav>
      </main>

      {/* Visualizer */}
      <div className="fixed bottom-8 right-8 flex gap-1 items-end z-20">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-1 bg-gradient-to-t from-red-500 to-pink-600 rounded-full animate-dance"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes floatUp {
          0% {
            transform: translateY(100vh) rotate(0deg);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 0.5;
          }
          100% {
            transform: translateY(-120px) rotate(360deg);
            opacity: 0;
          }
        }
        @keyframes dance {
          0%,
          100% {
            height: 20px;
          }
          50% {
            height: 50px;
          }
        }
        .animate-dance {
          animation: dance 1.4s ease-in-out infinite;
        }
        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-12px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s infinite;
        }
      `}</style>
    </div>
  );
};

export default KaraokeNotFoundPage;
