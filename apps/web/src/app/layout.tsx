import type { Metadata } from 'next';
// import { Geist, Geist_Mono } from 'next/font/google';
import '../index.css';
import { ClerkProvider } from '@clerk/nextjs';
import Header from '@/components/header';
import Providers from '@/components/providers';

// const geistSans = Geist({
//   variable: '--font-geist-sans',
//   subsets: ['latin'],
// });

// const geistMono = Geist_Mono({
//   variable: '--font-geist-mono',
//   subsets: ['latin'],
// });

export const metadata: Metadata = {
  title: 'clerk-convex-rn',
  description: 'clerk-convex-rn',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        <ClerkProvider>
          <Providers>
            <div className="grid h-svh grid-rows-[auto_1fr]">
              <Header />

              {children}
            </div>
          </Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
