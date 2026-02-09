
import React from 'react';
import { ProjectStatus } from '../../types';

interface BadgeProps {
  status: ProjectStatus | 'invited' | 'submitted';
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const styles: Record<string, string> = {
    COLLECTING: "bg-blue-50 text-blue-600 border-blue-100",
    PROCESSING: "bg-amber-50 text-amber-600 border-amber-100",
    REVIEWING: "bg-indigo-50 text-indigo-600 border-indigo-100",
    READY: "bg-green-50 text-green-600 border-green-100",
    invited: "bg-stone-50 text-stone-400 border-stone-100",
    submitted: "bg-green-50 text-green-600 border-green-100",
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status] || styles.invited}`}>
      {status.toLowerCase()}
    </span>
  );
};
