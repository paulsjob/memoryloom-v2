
import React from 'react';

interface LoadingScreenProps {
  title: string;
  subtitle?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ title, subtitle }) => {
  return (
    <div className="fixed inset-0 bg-stone-50/90 backdrop-blur-xl z-[100] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="relative mb-12">
        <div className="w-24 h-24 bg-amber-100 rounded-[2.5rem] animate-pulse"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
      <h2 className="text-3xl font-bold text-stone-900 mb-4 italic serif">{title}</h2>
      {subtitle && <p className="text-stone-500 max-w-sm leading-relaxed">{subtitle}</p>}
      
      <div className="mt-12 flex gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-bounce"></div>
      </div>
    </div>
  );
};
