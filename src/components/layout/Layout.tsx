import { ReactNode } from 'react';
import { Navbar } from './Navbar';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
