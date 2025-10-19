"use client";

import React from 'react';
import MarqueeBanner from '@/components/MarqueeBanner';

type BannerSize = 'small' | 'medium' | 'large';

interface SectionProps {
  id?: string;
  className?: string;
  children: React.ReactNode;
  banner?: boolean;
  bannerSize?: BannerSize;
  bannerOpacity?: number; // 0-100
}

export default function Section({ id, className = '', children, banner = true, bannerSize = 'medium', bannerOpacity = 80 }: SectionProps) {
  const sizeMap: Record<BannerSize, string> = {
    small: 'w-20 md:w-28',
    medium: 'w-28 md:w-36',
    large: 'w-44 md:w-56'
  };

  const opacityClass = `bg-opacity-${Math.min(100, Math.max(0, bannerOpacity))}`;

  return (
    <section id={id} className={className}>
      {banner ? (
        <div className={`my-6 absolute top-4 flex w-full justify-center z-20`}>
          <div className={`${sizeMap[bannerSize]} ${opacityClass}`}>
            <MarqueeBanner />
          </div>
        </div>
      ) : null}
      {children}
    </section>
  );
}
