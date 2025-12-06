import { ReactNode } from 'react';
import { Navbar } from './Navbar';
import { MessageCircle } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background bg-grid-pattern">
      <Navbar />
      <main>{children}</main>
      
      {/* WhatsApp Support Button */}
      <a
        href="https://wa.me/12023612218"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white px-4 py-3 rounded-full shadow-lg transition-all hover:scale-105"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="font-medium">Support</span>
      </a>
    </div>
  );
}
