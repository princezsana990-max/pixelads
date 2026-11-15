import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-content flex flex-col flex-1 min-h-screen transition-all duration-250">
        <Topbar onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-x-hidden" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-main)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
