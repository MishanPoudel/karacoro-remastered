/**
 * SEO and Meta Tag Management
 */

import { Metadata } from 'next';

interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  section?: string;
  tags?: string[];
}

export function generateMetadata(config: SEOConfig): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://karaoke-party.com';
  const defaultImage = `${baseUrl}/og-image.jpg`;

  return {
    title: config.title,
    description: config.description,
    keywords: config.keywords,
    authors: config.author ? [{ name: config.author }] : undefined,
    openGraph: {
      type: config.type || 'website',
      locale: 'en_US',
      url: config.url || baseUrl,
      siteName: 'Karaoke Party',
      title: config.title,
      description: config.description,
      images: [
        {
          url: config.image || defaultImage,
          width: 1200,
          height: 630,
          alt: config.title,
        },
      ],
      publishedTime: config.publishedTime,
      modifiedTime: config.modifiedTime,
      section: config.section,
      tags: config.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: config.title,
      description: config.description,
      images: [config.image || defaultImage],
    },
    robots: 'index, follow',
    alternates: {
      canonical: config.url || baseUrl,
    },
  };
}

// Predefined SEO configs for common pages
export const seoConfigs = {
  home: {
    title: 'Karaoke Party - Sing Together Online',
    description: 'Create or join karaoke rooms and sing along with friends from anywhere in the world. Real-time synchronized karaoke experience with voice chat.',
    keywords: ['karaoke', 'singing', 'online', 'party', 'music', 'youtube', 'real-time', 'voice chat', 'friends', 'entertainment'],
  },
  
  room: (roomId: string) => ({
    title: `Karaoke Room ${roomId} - Karaoke Party`,
    description: `Join karaoke room ${roomId} and sing along with friends in real-time. Synchronized video playback and voice chat included.`,
    keywords: ['karaoke room', 'online singing', 'voice chat', 'real-time', 'synchronized'],
  }),
  
  inspection: {
    title: 'Theater Inspection - Karaoke Party',
    description: 'Comprehensive theater inspection tool for safety and technical equipment assessment.',
    keywords: ['theater inspection', 'safety assessment', 'technical equipment', 'venue inspection'],
  },
  
  reports: {
    title: 'Inspection Reports - Karaoke Party',
    description: 'View and manage theater inspection reports with detailed safety and equipment assessments.',
    keywords: ['inspection reports', 'theater safety', 'equipment assessment', 'venue reports'],
  },
};

// JSON-LD structured data
export function generateStructuredData(type: 'WebApplication' | 'Organization' | 'Event', data: any) {
  const baseStructuredData = {
    '@context': 'https://schema.org',
    '@type': type,
  };

  switch (type) {
    case 'WebApplication':
      return {
        ...baseStructuredData,
        name: 'Karaoke Party',
        description: 'Online karaoke application for singing with friends',
        url: process.env.NEXT_PUBLIC_BASE_URL,
        applicationCategory: 'Entertainment',
        operatingSystem: 'Web Browser',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          'Real-time video synchronization',
          'Voice chat',
          'YouTube integration',
          'Room management',
          'Live chat',
        ],
        ...data,
      };

    case 'Organization':
      return {
        ...baseStructuredData,
        name: 'Karaoke Party',
        url: process.env.NEXT_PUBLIC_BASE_URL,
        logo: `${process.env.NEXT_PUBLIC_BASE_URL}/logo.png`,
        sameAs: [
          // Add social media URLs here
        ],
        ...data,
      };

    case 'Event':
      return {
        ...baseStructuredData,
        name: data.name || 'Karaoke Session',
        description: data.description || 'Online karaoke session with friends',
        startDate: data.startDate,
        endDate: data.endDate,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
        location: {
          '@type': 'VirtualLocation',
          url: data.url || process.env.NEXT_PUBLIC_BASE_URL,
        },
        organizer: {
          '@type': 'Organization',
          name: 'Karaoke Party',
          url: process.env.NEXT_PUBLIC_BASE_URL,
        },
        ...data,
      };

    default:
      return baseStructuredData;
  }
}