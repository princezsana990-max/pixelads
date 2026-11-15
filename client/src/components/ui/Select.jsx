import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = forwardRef(({
  label,
  error,
  helper,
  children,
  className = '',
  containerClass = '',
  ...props
}, ref) => (
  <div className={`space-y-1 ${containerClass}`}>
    {label && <label className="form-label">{label}</label>}
    <div className="relative">
      <select
        ref={ref}
        className={`glass-input appearance-none pr-9 cursor-pointer ${error ? 'border-red-500/60' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
    </div>
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    {helper && !error && <p className="text-white/40 text-xs mt-1">{helper}</p>}
  </div>
));

Select.displayName = 'Select';
