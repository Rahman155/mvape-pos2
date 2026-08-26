import type { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';

import '@/styles/globals.css';
import { RootProviders } from '@/components/RootProviders';
import OfflineIndicator from '@/components/OfflineIndicator';

export const metadata: Metadata = {
  title: 'Vapestore POS - Progressive Web Application',
  description: 'Manage your vape store with our powerful Point of Sale system',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
  keywords: ['POS', 'Point of Sale', 'Vapestore', 'Management', 'PWA'],
  authors: [{ name: 'Vapestore Team' }],
  creator: 'Vapestore Team',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vapestore POS',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#2563EB',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Vapestore POS" />
        <meta name="theme-color" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="antialiased">
        <RootProviders>
          <OfflineIndicator position="top" showSyncStatus showPendingCount />
          {children}
        </RootProviders>
      </body>
    </html>
  );
}
