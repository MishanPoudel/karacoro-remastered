import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { ErrorBoundary } from '@/lib/error-boundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Karaoke Party - Sing Together Online',
  description: 'Create or join karaoke rooms and sing along with friends from anywhere in the world. Real-time synchronized karaoke experience with voice chat.',
  keywords: ['karaoke', 'singing', 'online', 'party', 'music', 'youtube', 'real-time', 'voice chat'],
  authors: [{ name: 'Karaoke Party Team' }],
  creator: 'Karaoke Party',
  publisher: 'Karaoke Party',
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_BASE_URL || 'https://karaoke-party.com',
    siteName: 'Karaoke Party',
    title: 'Karaoke Party - Sing Together Online',
    description: 'Create or join karaoke rooms and sing along with friends from anywhere in the world.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Karaoke Party - Sing Together Online',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Karaoke Party - Sing Together Online',
    description: 'Create or join karaoke rooms and sing along with friends from anywhere in the world.',
    images: ['/og-image.jpg'],
  },
  viewport: 'width=device-width, initial-scale=1',
  themeColor: '#ef4444',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ErrorBoundary>
          {children}
          <Toaster 
            position="bottom-left"
            toastOptions={{
              style: {
                background: '#1f2937',
                color: '#ffffff',
                border: '1px solid #ef4444',
              },
            }}
            closeButton
            richColors
          />
        </ErrorBoundary>
      </body>
    </html>
  );
}