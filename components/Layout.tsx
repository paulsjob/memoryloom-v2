
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (view: any) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-amber-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button 
            onClick={() => onNavigate('landing')} 
            className="text-2xl font-bold text-stone-800 tracking-tight flex items-center gap-2 group"
          >
            <div className="w-8 h-8 bg-amber-500 rounded-lg group-hover:rotate-6 transition-transform"></div>
            MemoryLoom
          </button>
          <nav className="flex gap-6 text-sm font-medium text-stone-600 items-center">
            <button onClick={() => onNavigate('organizer-dashboard')} className="hover:text-amber-600 transition-colors">Projects</button>
            <button className="bg-stone-900 text-white px-5 py-2 rounded-full hover:bg-stone-800 transition-all shadow-sm">Sign In</button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="bg-stone-100 border-t border-stone-200 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-stone-500 text-sm">
          <div>
            <h4 className="font-semibold text-stone-800 mb-4">MemoryLoom</h4>
            <p className="leading-relaxed">Helping people show up for each other, even when time and distance make it hard.</p>
          </div>
          <div>
            <h4 className="font-semibold text-stone-800 mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-amber-600">How it Works</a></li>
              <li><a href="#" className="hover:text-amber-600">Pricing</a></li>
              <li><a href="#" className="hover:text-amber-600">Examples</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-stone-800 mb-4">Support</h4>
            <ul className="space-y-2">
              <li><a href="#" className="hover:text-amber-600">Help Center</a></li>
              <li><a href="#" className="hover:text-amber-600">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-amber-600">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-stone-200 text-center text-xs text-stone-400">
          © {new Date().getFullYear()} MemoryLoom. Built with care for moments that matter.
        </div>
      </footer>
    </div>
  );
};

export default Layout;
