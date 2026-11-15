import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppLayout = () => {
  // Mobile drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Desktop sidebar collapse/hide state (saved in localStorage)
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('pixel_ads_sidebar_open');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setMobileSidebarOpen(prev => !prev);
    } else {
      setDesktopSidebarOpen(prev => {
        const next = !prev;
        localStorage.setItem('pixel_ads_sidebar_open', String(next));
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <Sidebar
        isOpen={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        desktopOpen={desktopSidebarOpen}
        onToggleDesktop={toggleSidebar}
      />

      <div
        className={`app-content flex flex-col flex-1 min-h-screen transition-all duration-300 ${
          desktopSidebarOpen ? 'lg:ml-[var(--sidebar-width)]' : 'lg:ml-0'
        }`}
      >
        <Topbar
          onToggleSidebar={toggleSidebar}
          isSidebarOpen={desktopSidebarOpen}
        />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
