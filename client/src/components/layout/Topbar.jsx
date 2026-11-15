import React, { useState, useEffect, useCallback } from 'react';
import { Menu, LogOut, Radio, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getAdsStatusApi } from '../../api/ads';
import { NotificationBell } from '../ui/NotificationBell';

export const Topbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [adsOnline, setAdsOnline] = useState(false);

  const fetchAdsStatus = useCallback(async () => {
    if (!user || user.role === 'admin') return;
    try {
      const data = await getAdsStatusApi();
      setAdsOnline(Boolean(data.isOnline));
    } catch {
    }
  }, [user]);

  useEffect(() => {
    fetchAdsStatus();
    const interval = setInterval(fetchAdsStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchAdsStatus]);

  return (
    <header className="glass-topbar h-16 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="hidden sm:block">
          <span className="font-heading font-black text-sm uppercase tracking-widest opacity-90">
            Order Management Portal
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {user?.role !== 'admin' && (
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-heading font-bold uppercase ${
              adsOnline
                ? 'border-orange-500/40 text-orange-500 bg-orange-500/12'
                : 'border-black/15 dark:border-white/15 opacity-60 bg-black/5 dark:bg-white/5'
            }`}
          >
            <Radio className={`w-3 h-3 ${adsOnline ? 'animate-pulse text-orange-500' : ''}`} />
            <span>Ads {adsOnline ? 'Online' : 'Offline'}</span>
          </div>
        )}

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
          className="p-2 rounded-lg border border-black/10 dark:border-white/15 hover:border-orange-500/50 hover:bg-orange-500/10 transition-colors text-orange-500"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <NotificationBell />

        <div className="hidden sm:block text-right">
          <div className="font-heading font-bold text-sm leading-tight">{user?.name}</div>
          <div className="text-[10px] font-mono opacity-50">{user?.employee_id}</div>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/15 dark:border-white/15 hover:border-orange-500/50 hover:bg-orange-500/10 transition-all font-heading font-bold text-xs uppercase"
        >
          <LogOut className="w-3.5 h-3.5 text-orange-500" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};
