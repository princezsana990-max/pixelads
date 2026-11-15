import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      <div className="max-w-md w-full glass-card p-8">
        <h1 className="font-heading font-black text-6xl text-orange-400 mb-2">404</h1>
        <h2 className="font-heading font-bold text-xl text-white mb-2">Page Not Found</h2>
        <p className="text-xs text-white/50 mb-6">
          The requested page does not exist or you do not have permission to view it.
        </p>
        <Link to="/">
          <Button variant="primary">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
};
