import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'ContentGen',
  description: 'AI-powered content generation backend',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
