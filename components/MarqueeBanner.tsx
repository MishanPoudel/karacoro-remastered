"use client";

import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';

export default function MarqueeBanner({ text }: { text?: string }) {
  const content = text || 'Sponsor KaraCoro — your ad here · Sponsor a room · Sponsor a feature · Contact: poudelmishan2@gmail.com';
  const [dismissed, setDismissed] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);

  // Dismissal is in-memory only (no localStorage persistence by request)
  const close = () => {
    setDismissed(true);
  };

  useEffect(() => {
    const setup = () => {
      const track = containerRef.current?.querySelector('.marquee-track') as HTMLElement | null;
      const inner = innerRef.current as HTMLElement | null;
      if (!track || !inner) return;

      // Duplicate groups until inner width >= 2x visible width for smooth loop
      const ensureDups = () => {
        const trackW = track.clientWidth;
        let innerW = inner.scrollWidth;
        while (innerW < trackW * 2) {
          const clone = inner.innerHTML;
          inner.insertAdjacentHTML('beforeend', clone);
          innerW = inner.scrollWidth;
        }
      };

      ensureDups();

      // Set animation duration proportional to the distance we travel (half the inner width), for steady speed (~100px/sec)
      const pxPerSecond = 100; // visual speed
      const applyAnimation = () => {
        const distance = inner.scrollWidth * 0.5; // keyframes move -50% of inner width
        const duration = Math.max(8, Math.round(distance / pxPerSecond));
        // Use explicit animation shorthand to ensure it's applied
        inner.style.animation = `marquee ${duration}s linear infinite`;
        return duration;
      };

      // Apply CSS animation and if it doesn't take effect (e.g., overridden globally), enable JS fallback
      const duration = applyAnimation();

      let rafId: number | null = null;
      let lastTs = 0;
      let offset = 0; // px
      let fallbackActive = false;

      const startFallback = () => {
        if (rafId) return;
        fallbackActive = true;
        lastTs = 0;
        const loop = (ts: number) => {
          if (!lastTs) lastTs = ts;
          const dt = (ts - lastTs) / 1000;
          lastTs = ts;
          offset -= pxPerSecond * dt;
          // loop when we've moved half the inner width
          const limit = inner.scrollWidth * 0.5;
          if (Math.abs(offset) >= limit) offset = 0;
          inner.style.transform = `translate3d(${offset}px,0,0)`;
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      };

      const stopFallback = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        fallbackActive = false;
      };

      // If computed style doesn't show the marquee animation, enable fallback
      const computed = getComputedStyle(inner).animationName || '';
      if (!computed || computed === 'none') {
        startFallback();
      }

      // Recompute on resize: re-apply animation and restart fallback if needed
      const onResize = () => {
        applyAnimation();
        if (!getComputedStyle(inner).animationName || getComputedStyle(inner).animationName === 'none') {
          stopFallback();
          startFallback();
        } else {
          stopFallback();
        }
      };
      window.addEventListener('resize', onResize);
      return () => {
        window.removeEventListener('resize', onResize);
        stopFallback();
      };
    };

    const cancel = setup();
    return () => {
      if (typeof cancel === 'function') cancel();
    };
  }, []);

  if (dismissed) return null;

  return (
    <section aria-label="sponsor-banner" className="w-full bg-gradient-to-r from-black/70 via-red-900/80 to-black/70 border-t border-b border-red-800/40">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div ref={containerRef} className="relative">
          {/* fading mask on edges */}
          <div className="absolute inset-y-0 left-0 w-12 pointer-events-none" style={{ background: 'linear-gradient(90deg, rgba(0,0,0,0.12), transparent)' }} />
          <div className="absolute inset-y-0 right-0 w-12 pointer-events-none" style={{ background: 'linear-gradient(270deg, rgba(0,0,0,0.12), transparent)' }} />

          {/* Marquee area is a clickable link for the whole track */}
          <Link href="/sponsor" className="block">
            <div
              className="marquee-track overflow-hidden whitespace-nowrap py-2"
              onMouseEnter={() => {
                const el = containerRef.current?.querySelector('.marquee-inner') as HTMLElement | null;
                if (el) el.style.animationPlayState = 'paused';
              }}
              onMouseLeave={() => {
                const el = containerRef.current?.querySelector('.marquee-inner') as HTMLElement | null;
                if (el) el.style.animationPlayState = 'running';
              }}
            >
              <div ref={innerRef} className="marquee-inner inline-flex items-center gap-6 text-sm md:text-base text-white font-medium">
                <div className="marquee-group inline-flex items-center gap-6">
                  <span className="marquee-item">{content}</span>
                  <span className="marquee-sep text-amber-400">•</span>
                </div>
                <div className="marquee-group inline-flex items-center gap-6">
                  <span className="marquee-item">{content}</span>
                  <span className="marquee-sep text-amber-400">•</span>
                </div>
              </div>
            </div>
          </Link>

          {/* Dismiss button sits outside the clickable Link */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <button
              onClick={close}
              aria-label="dismiss banner"
              className="text-gray-300 hover:text-white rounded-md px-2 py-1"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .marquee-track { position: relative; width: 100%; overflow: hidden; }
        .marquee-inner {
          display: flex; /* block-level flex to make transforms reliable */
          gap: 2rem;
          align-items: center;
          min-width: max-content;
          animation: marquee 26s linear infinite;
          transform: translate3d(0,0,0);
          will-change: transform;
        }
        .marquee-group { display: inline-flex; gap: 2rem; align-items: center; white-space: nowrap; flex: none; }
        .marquee-item { display: inline-block; }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-inner { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
