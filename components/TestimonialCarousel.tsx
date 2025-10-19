import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';

interface Testimonial {
  name: string;
  role?: string;
  image?: string;
  rating?: number;
  text?: string;
  location?: string;
  content?: string;
  avatar?: string;
}

const slideWidth = 18;

const sleep = (ms = 0) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const CarouselSlideItem = ({ 
  pos, 
  idx, 
  testimonials, 
  length 
}: { 
  pos: number; 
  idx: number; 
  testimonials: Testimonial[]; 
  length: number;
}) => {
  const item = createItem(pos, idx, testimonials, length);
  const isActive = pos === length;

  return (
    <li
      className="absolute inline-block h-[18rem] w-[18rem] p-3 transition-all duration-300"
      style={item.styles}
    >
      <div className="relative flex h-full w-full cursor-pointer overflow-hidden group rounded-md">
        <img
          src={item.testimonial.image}
          alt={item.testimonial.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />

        <div className="absolute top-3 left-3 z-20">
          {item.testimonial.image ? (
            <img
              src={item.testimonial.image}
              alt={item.testimonial.name}
              className="h-9 w-9 rounded-full ring-2 ring-destructive/60 object-cover"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center font-bold ring-2 ring-destructive/60">
              {(item.testimonial.name || '?').charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <div className="absolute bottom-[-1.75rem] h-[10%] w-full px-2">
        <div className="flex items-center justify-between">
          <div>
            <h4 className={`mt-2 mb-0 uppercase text-sm font-semibold ${isActive ? 'text-white' : 'text-muted-foreground'}`}>{item.testimonial.name}</h4>
            <p className={`mt-1 mb-0 text-xs ${isActive ? 'text-white/70' : 'text-muted-foreground'}`}>{item.testimonial.role}{item.testimonial.location ? ` · ${item.testimonial.location}` : ''}</p>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, s) => (
              <Star key={s} size={12} className={s < (item.testimonial.rating ?? 5) ? 'fill-yellow-400 text-yellow-400' : 'fill-muted text-muted-foreground'} />
            ))}
          </div>
        </div>
        {(item.testimonial.content || item.testimonial.text) ? (
          <p className={`mt-2 mb-0 text-sm leading-tight ${isActive ? 'text-white' : 'text-muted-foreground'}`}>{item.testimonial.content ?? item.testimonial.text}</p>
        ) : null}
      </div>
    </li>
  );
};

const createItem = (position: number, idx: number, items: Testimonial[], length: number) => {
  const item: any = {
    styles: {
      transform: `translateX(${position * slideWidth}rem)`,
    },
    testimonial: items[idx],
  };

  switch (position) {
    case length - 1:
    case length + 1:
      item.styles = { ...item.styles, filter: 'grayscale(100%)' };
      break;
    case length:
      break;
    default:
      item.styles = { ...item.styles, opacity: 0 };
      break;
  }

  return item;
};

export default function TestimonialCarousel({ testimonials = [] }: { testimonials?: Testimonial[] }) {
  const normalize = (t: any): Testimonial => {
    if (!t) return { name: 'Unknown' } as Testimonial;
    if (t.player) {
      const p = t.player;
      return {
        name: p.title || p.name || t.name || 'Unknown',
        text: p.desc || t.text || t.content || '',
        content: t.content,
        image: p.image || t.image || '',
        avatar: t.avatar || '',
        location: t.location || '',
        role: t.role || '',
        rating: t.rating ?? 5,
      } as Testimonial;
    }

    return {
      name: t.name || t.title || 'Unknown',
      text: t.text || t.content || t.desc || '',
      content: t.content,
      image: t.image || t.avatar || '',
      avatar: t.avatar || '',
      location: t.location || '',
      role: t.role || '',
      rating: t.rating ?? 5,
    } as Testimonial;
  };

  const raw = testimonials && testimonials.length ? testimonials : [];
  const data = raw.map(normalize);
  const length = data.length;
  const _items = [...data, ...data];
  const keys = Array.from(Array(_items.length).keys());
  
  const [items, setItems] = useState(keys);
  const [isTicking, setIsTicking] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const bigLength = items.length;

  const prevClick = (jump = 1) => {
    if (!isTicking) {
      setIsTicking(true);
      setItems((prev) => {
        return prev.map((_, i) => prev[(i + jump) % bigLength]);
      });
    }
  };

  const nextClick = (jump = 1) => {
    if (!isTicking) {
      setIsTicking(true);
      setItems((prev) => {
        return prev.map((_, i) => prev[(i - jump + bigLength) % bigLength]);
      });
    }
  };

  const handleDotClick = (idx: number) => {
    if (idx < activeIdx) prevClick(activeIdx - idx);
    if (idx > activeIdx) nextClick(idx - activeIdx);
  };

  useEffect(() => {
    if (isTicking) sleep(300).then(() => setIsTicking(false));
  }, [isTicking]);

  useEffect(() => {
    setActiveIdx((length - (items[0] % length)) % length);
  }, [items, length]);

  return (
    <div className="flex items-center justify-center relative w-[80%] left-[50%] -translate-x-1/2">
      <div className="h-[35rem] relative" style={{ width: `${slideWidth * 3}rem` }}>
        <button
          className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center bg-transparent border-0 cursor-pointer z-10"
          style={{ left: '-10rem' }}
          onClick={() => prevClick()}
          aria-label="Previous slide"
        >
          <i className="border-destructive border-r-[0.4rem] border-b-[0.4rem] h-24 w-24 rotate-[135deg]" />
        </button>

        <div className="h-full overflow-hidden relative w-full">
          <ul
            className="h-full absolute left-1/2 -translate-x-1/2 m-0 p-0 list-none"
            style={{ width: `${(length + 0.5) * slideWidth * 2}rem` }}
          >
            {items.map((pos, i) => (
              <CarouselSlideItem 
                key={i} 
                idx={i} 
                pos={pos} 
                testimonials={_items}
                length={length}
              />
            ))}
          </ul>
        </div>

        <button
          className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center bg-transparent border-0 cursor-pointer z-10"
          style={{ right: '-10rem' }}
          onClick={() => nextClick()}
          aria-label="Next slide"
        >
          <i className="border-destructive border-r-[0.4rem] border-b-[0.4rem] h-24 w-24 -rotate-45" />
        </button>

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center">
          {items.slice(0, length).map((pos, i) => (
            <button
              key={i}
              onClick={() => handleDotClick(i)}
              className={`h-3 w-8 rounded-full mx-1 transition-colors duration-200 ${
                i === activeIdx ? 'bg-destructive' : 'bg-muted'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}