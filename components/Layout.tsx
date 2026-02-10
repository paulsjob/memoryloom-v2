
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (view: any) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onNavigate }) => {
  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-amber-100">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-stone-200 px-4 md:px-6 py-3 md:py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <button 
            onClick={() => onNavigate('landing')} 
            className="text-xl md:text-2xl font-bold text-stone-800 tracking-tight flex items-center gap-2 group"
          >
            <div className="w-6 h-6 md:w-8 md:h-8 bg-amber-500 rounded-lg group-hover:rotate-6 transition-transform"></div>
            MemoryLoom
          </button>
          <nav className="flex gap-4 md:gap-6 text-xs md:text-sm font-bold items-center">
            <button onClick={() => onNavigate('organizer-dashboard')} className="text-stone-500 hover:text-amber-600 transition-colors hidden sm:block">Projects</button>
            <button className="bg-stone-900 text-white px-4 md:px-5 py-2 rounded-full hover:bg-stone-800 transition-all shadow-sm">Sign In</button>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="bg-stone-100 border-t border-stone-200 py-12 px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 text-stone-500 text-sm">
          <div>
            <h4 className="font-bold text-stone-800 mb-4 uppercase tracking-widest text-[10px]">MemoryLoom</h4>
            <p className="leading-relaxed">Built for moments that matter, helping people show up for each other regardless of distance.</p>
          </div>
          <div>
            <h4 className="font-bold text-stone-800 mb-4 uppercase tracking-widest text-[10px]">Product</h4>
            <ul className="space-y-2 font-medium">
              <li><a href="#" className="hover:text-amber-600">How it Works</a></li>
              <li><a href="#" className="hover:text-amber-600">Examples</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-stone-800 mb-4 uppercase tracking-widest text-[10px]">Legal</h4>
            <ul className="space-y-2 font-medium">
              <li><a href="#" className="hover:text-amber-600">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-amber-600">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-stone-200 text-center text-[10px] font-bold text-stone-400 tracking-widest uppercase">
          © {new Date().getFullYear()} MemoryLoom • Woven with Love
        </div>
      </footer>
    </div>
  );
};

export default Layout;
