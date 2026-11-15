import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ open, onClose, title, children, maxWidth = 'max-w-xl', footer }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose?.(); }}
    >
      <div className={`modal-box ${maxWidth} w-full`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
          <h2 className="font-heading font-bold text-base sm:text-lg truncate pr-4" style={{ color: 'var(--text-main)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 sm:py-5">{children}</div>

        {footer && (
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-white/10 flex flex-wrap items-center justify-end gap-2 sm:gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
