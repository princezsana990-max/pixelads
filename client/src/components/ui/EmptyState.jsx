import React from 'react';
import { FolderOpen } from 'lucide-react';

export const EmptyState = ({ title = 'No data found', description = '', action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
      style={{ background: 'var(--glass-bg)', border: '1.5px solid var(--glass-border)' }}>
      <FolderOpen className="w-7 h-7 text-white/30" />
    </div>
    <p className="font-heading font-bold text-white/60 text-lg mb-1">{title}</p>
    {description && <p className="text-white/35 text-sm max-w-xs">{description}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);
