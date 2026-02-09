
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', onClick, hover = true }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-white border border-stone-200 rounded-3xl overflow-hidden
        ${hover ? 'hover:shadow-xl hover:border-amber-200 cursor-pointer' : ''}
        transition-all duration-300
        ${className}
      `}
    >
      {children}
    </div>
  );
};
