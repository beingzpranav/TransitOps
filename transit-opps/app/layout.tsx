import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'TransitOps — Smart Transport Operations Platform',
  description:
    'Fleet management platform covering vehicle registry, driver management, trip dispatch, maintenance, fuel/expense tracking, and operational analytics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
