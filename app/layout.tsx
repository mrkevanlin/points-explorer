import type { Metadata, Viewport } from 'next';
import { DM_Sans, Manrope } from 'next/font/google';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'Pointline — Your rewards, connected',
  description: 'Drag credit cards and loyalty programs onto a canvas to explore point transfers, compare ratios, and discover shared travel partners.',
  openGraph: {
    title: 'Pointline — Your rewards, connected',
    description: 'Build your rewards map. Explore credit card and loyalty program transfer partnerships.',
    type: 'website',
  },
  twitter: { card: 'summary' },
};

export const viewport: Viewport = {
  themeColor: '#5939a5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
