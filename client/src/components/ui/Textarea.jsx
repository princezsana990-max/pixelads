import React, { forwardRef } from 'react';

export const Textarea = forwardRef(({
  label,
  error,
  helper,
  rows = 4,
  className = '',
  containerClass = '',
  ...props
}, ref) => (
  <div className={`space-y-1 ${containerClass}`}>
    {label && <label className="form-label">{label}</label>}
    <textarea
      ref={ref}
      rows={rows}
      className={`glass-input resize-y min-h-[80px] ${error ? 'border-red-500/60' : ''} ${className}`}
      {...props}
    />
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    {helper && !error && <p className="text-white/40 text-xs mt-1">{helper}</p>}
  </div>
));

Textarea.displayName = 'Textarea';
