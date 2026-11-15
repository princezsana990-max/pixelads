import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Lock, User, AlertCircle } from 'lucide-react';

export const LoginPage = () => {
  const { user, login } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'order_taker') return <Navigate to="/order-taker/dashboard" replace />;
    if (user.role === 'editor') return <Navigate to="/editor/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login({ username, password });
      if (loggedInUser.role === 'admin') navigate('/admin/dashboard');
      else if (loggedInUser.role === 'order_taker') navigate('/order-taker/dashboard');
      else if (loggedInUser.role === 'editor') navigate('/editor/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          {settings.company_logo_url ? (
            <img
              src={settings.company_logo_url}
              alt="Logo"
              className="w-16 h-16 object-contain mx-auto mb-4 rounded-2xl"
              style={{ border: '1.5px solid rgba(255,255,255,0.2)' }}
            />
          ) : (
            <div
              className="w-16 h-16 flex items-center justify-center rounded-2xl font-heading font-black text-2xl text-white mx-auto mb-4"
              style={{ background: 'var(--orange)', boxShadow: 'var(--shadow-orange)' }}
            >
              P
            </div>
          )}
          <h1 className="font-heading font-black text-2xl text-white">
            {settings.company_name || 'Pixel Ads'}
          </h1>
          <p className="text-white/40 text-xs mt-1 uppercase tracking-widest">
            Order Management System
          </p>
        </div>

        <div className="glass-card p-7">
          <h2 className="font-heading font-bold text-base text-white mb-5">Sign in to your account</h2>

          {error && (
            <div className="flex items-start gap-2.5 mb-5 p-3 rounded-lg bg-red-500/12 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="form-label">Username</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                  className="glass-input pl-9"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="form-label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="glass-input pl-9"
                />
              </div>
            </div>

            <Button type="submit" className="w-full mt-2" loading={loading}>
              Sign In to Portal
            </Button>
          </form>

          <div className="mt-5 pt-4 border-t border-white/10 text-center text-[11px] text-white/30">
            Authorized personnel only. Contact admin for access.
          </div>
        </div>
      </div>
    </div>
  );
};
