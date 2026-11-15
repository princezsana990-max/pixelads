import React, { forwardRef } from 'react';

export const Input = forwardRef(({
  label,
  error,
  helper,
  className = '',
  containerClass = '',
  readOnly = false,
  ...props
}, ref) => (
  <div className={`space-y-1 ${containerClass}`}>
    {label && <label className="form-label">{label}</label>}
    <input
      ref={ref}
      readOnly={readOnly}
      className={`glass-input ${readOnly ? 'opacity-60 cursor-default' : ''} ${error ? 'border-red-500/60 focus:border-red-400' : ''} ${className}`}
      {...props}
    />
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    {helper && !error && <p className="text-white/40 text-xs mt-1">{helper}</p>}
  </div>
));

Input.displayName = 'Input';
