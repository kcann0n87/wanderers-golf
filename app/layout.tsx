import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Wanderers Golf Day',
  description: 'Live Stableford Score Tracker - Wanderers Golf Club',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-100">
        <nav className="bg-emerald-800 text-white shadow-lg">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Wanderers Golf Day
            </Link>
            <div className="flex gap-4 text-sm">
              <Link href="/leaderboard" className="hover:text-emerald-300 transition-colors">
                Leaderboard
              </Link>
              <Link href="/admin" className="hover:text-emerald-300 transition-colors">
                Admin
              </Link>
            </div>
          </div>
        </nav>
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
