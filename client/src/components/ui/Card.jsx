import React from 'react';

export const Card = ({ children, className = '', hover = false, padding = true, ...props }) => (
  <div
    className={`glass-card ${hover ? 'glass-card-hover cursor-pointer' : ''} ${padding ? 'p-5' : ''} ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({ children, className = '' }) => (
  <div className={`flex items-center justify-between mb-4 ${className}`}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`font-heading font-bold text-lg text-white ${className}`}>{children}</h3>
);
