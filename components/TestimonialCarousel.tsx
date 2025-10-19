"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

export type Testimonial = {
  name: string;
  location?: string;
  role?: string;
  avatar?: string;
  rating?: number;
  text?: string;
  content?: string;
  image?: string;
};

export default function TestimonialCarousel({ testimonials }: { testimonials: Testimonial[] }) {
  const n = testimonials.length;
  const clones = 2;
  
  const items = useMemo(() => {
    if (n === 0) return [] as Testimonial[];
    const head = testimonials.slice(-clones);
    const tail = testimonials.slice(0, clones);
    return [...head, ...testimonials, ...tail];
  }, [testimonials, n]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [current, setCurrent] = useState(clones);
  const [slideW, setSlideW] = useState(560);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Measure slide width
  useLayoutEffect(() => {
    let raf = 0;
    let mounted = true;

    const measure = () => {
      if (!mounted || !trackRef.current) return;
      const s = trackRef.current.querySelector('[data-slide]') as HTMLElement | null;
      if (s) setSlideW(Math.min(window.innerWidth * 0.92, s.getBoundingClientRect().width));
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };

    schedule();
    window.addEventListener('resize', schedule);

    const ro = new ResizeObserver(schedule);
    if (trackRef.current) ro.observe(trackRef.current);

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', schedule);
      try { ro.disconnect(); } catch (e) { /* ignore */ }
    };
  }, [items.length]);

  // Position track
  useLayoutEffect(() => {
    if (!containerRef.current || !trackRef.current) return;
    const cont = containerRef.current;
    const track = trackRef.current;
    const viewportW = cont.getBoundingClientRect().width;
    const centerOffset = viewportW / 2 - slideW / 2;
    const gap = 16;
    const x = current * (slideW + gap);
    track.style.transition = 'transform 500ms cubic-bezier(0.4, 0.0, 0.2, 1)';
    track.style.transform = `translateX(${-(x - centerOffset)}px)`;
    setIsTransitioning(true);
  }, [current, slideW]);

  // Handle infinite loop
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    
    const onEnd = () => {
      setIsTransitioning(false);
      
      if (current >= clones + n) {
        const base = clones;
        track.style.transition = 'none';
        const cont = containerRef.current!;
        const viewportW = cont.getBoundingClientRect().width;
        const centerOffset = viewportW / 2 - slideW / 2;
        const gap = 16;
        const x = base * (slideW + gap);
        track.style.transform = `translateX(${-(x - centerOffset)}px)`;
        void track.offsetHeight;
        track.style.transition = 'transform 500ms cubic-bezier(0.4, 0.0, 0.2, 1)';
        setCurrent(base);
      }
      
      if (current < clones) {
        const base = clones + n - 1;
        track.style.transition = 'none';
        const cont = containerRef.current!;
        const viewportW = cont.getBoundingClientRect().width;
        const centerOffset = viewportW / 2 - slideW / 2;
        const gap = 16;
        const x = base * (slideW + gap);
        track.style.transform = `translateX(${-(x - centerOffset)}px)`;
        void track.offsetHeight;
        track.style.transition = 'transform 500ms cubic-bezier(0.4, 0.0, 0.2, 1)';
        setCurrent(base);
      }
    };
    
    track.addEventListener('transitionend', onEnd);
    return () => track.removeEventListener('transitionend', onEnd);
  }, [current, n, slideW, clones]);

  // Navigation with debouncing
  const prev = useCallback(() => {
    if (isTransitioning) return;
    setCurrent(c => c - 1);
  }, [isTransitioning]);

  const next = useCallback(() => {
    if (isTransitioning) return;
    setCurrent(c => c + 1);
  }, [isTransitioning]);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  // Touch support
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (diff > 50) next();
    else if (diff < -50) prev();
  };

  if (testimonials.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-400 text-lg">No testimonials available</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4">
      <div 
        ref={containerRef} 
        className="w-full overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Side fade gradients */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-24 md:w-32 z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-24 md:w-32 z-10" />

        <div 
          ref={trackRef} 
          className="flex items-stretch gap-4 py-8" 
          style={{ willChange: 'transform' }}
        >
          {items.map((t, i) => {
            const isActive = i === current;
            const displayRating = t.rating || 5;
            
            return (
              <div 
                key={`${t.name}-${i}`} 
                data-slide 
                className="flex-shrink-0 transition-all duration-300 ease-out" 
                style={{ 
                  width: 'min(92vw, 560px)', 
                  transform: isActive ? 'scale(1.04)' : 'scale(0.94)',
                  opacity: isActive ? 1 : 0.5
                }}
              >
                <Card className="bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border-red-800/40 h-full shadow-xl hover:shadow-2xl hover:border-red-700/50 transition-all duration-300">
                  <CardHeader className="flex flex-row items-center gap-4 px-6 py-6">
                    <Avatar className="h-16 w-16 ring-2 ring-red-800/50">
                      {t.image ? (
                        <AvatarImage src={t.image} alt={t.name} loading="lazy" />
                      ) : null}
                      <AvatarFallback className="bg-gradient-to-br from-red-700 to-red-900 text-white text-2xl font-bold">
                        {t.avatar || t.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-red-400 text-xl md:text-2xl font-bold truncate">
                        {t.name}
                      </CardTitle>
                      <CardDescription className="text-base md:text-lg text-gray-400 truncate">
                        {t.location || t.role || 'Customer'}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star 
                          key={s} 
                          size={18} 
                          className={s < displayRating 
                            ? "fill-yellow-400 text-yellow-400" 
                            : "fill-gray-700 text-gray-700"
                          }
                        />
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 pb-6">
                    <p className="text-gray-300 text-base md:text-lg leading-relaxed">
                      {t.text || t.content || 'Great experience!'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex justify-center items-center mt-8 gap-6">
        <Button 
          onClick={prev}
          disabled={isTransitioning}
          aria-label="Previous testimonial" 
          className="relative bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-40 disabled:cursor-not-allowed border-none text-white px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        
        {/* Progress dots */}
        <div className="flex gap-2">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => !isTransitioning && setCurrent(i + clones)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                (current - clones + n) % n === i 
                  ? 'w-10 bg-red-500 shadow-lg shadow-red-500/50' 
                  : 'w-2.5 bg-gray-600 hover:bg-gray-500'
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>
        
        <Button 
          onClick={next}
          disabled={isTransitioning}
          aria-label="Next testimonial" 
          className="relative bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-40 disabled:cursor-not-allowed border-none text-white px-4 py-3 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}