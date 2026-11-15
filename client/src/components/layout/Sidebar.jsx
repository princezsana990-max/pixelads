import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  CreditCard,
  FileText,
  Settings,
  PlusCircle,
  Receipt,
  Phone,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';

export const Sidebar = ({ isOpen, onClose, desktopOpen = true, onToggleDesktop }) => {
  const { user } = useAuth();
  const { settings } = useSettings();

  const adminNav = [
    { name: 'Dashboard',       path: '/admin/dashboard',       icon: LayoutDashboard },
    { name: 'Orders',          path: '/admin/orders',          icon: ShoppingCart },
    { name: 'Employees',       path: '/admin/employees',       icon: Users },
    { name: 'Payments',        path: '/admin/payments',        icon: CreditCard },
    { name: 'Invoices',        path: '/admin/invoices',        icon: Receipt },
    { name: 'Communications',  path: '/admin/communications',  icon: Phone },
    { name: 'Reports',         path: '/admin/reports',         icon: FileText },
    { name: 'Settings',        path: '/admin/settings',        icon: Settings },
  ];

  const orderTakerNav = [
    { name: 'Dashboard',       path: '/order-taker/dashboard',    icon: LayoutDashboard },
    { name: 'New Order',       path: '/order-taker/orders/new',   icon: PlusCircle },
  ];

  const editorNav = [
    { name: 'My Assignments',  path: '/editor/dashboard',         icon: LayoutDashboard },
  ];

  const navItems =
    user?.role === 'admin'       ? adminNav :
    user?.role === 'order_taker' ? orderTakerNav :
    user?.role === 'editor'      ? editorNav : [];

  const roleBadgeColor = {
    admin:       'text-orange-400 bg-orange-400/15 border-orange-400/30',
    order_taker: 'text-blue-400 bg-blue-400/15 border-blue-400/30',
    editor:      'text-green-400 bg-green-400/15 border-green-400/30',
  }[user?.role] || '';

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-30 lg:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 glass-sidebar flex flex-col transition-all duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          desktopOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'
        }`}
        style={{ width: 'var(--sidebar-width)' }}
      >
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3 overflow-hidden">
            {settings.company_logo_url ? (
              <img
                src={settings.company_logo_url}
                alt="Logo"
                className="w-8 h-8 object-contain rounded-lg border border-white/20"
              />
            ) : (
              <div
                className="w-8 h-8 flex items-center justify-center rounded-lg font-heading font-black text-sm text-white"
                style={{ background: 'var(--orange)', boxShadow: 'var(--shadow-orange)' }}
              >
                P
              </div>
            )}
            <span className="font-heading font-black text-base text-white tracking-tight truncate">
              {settings.company_name || 'PIXEL ADS'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              title="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
            {onToggleDesktop && (
              <button
                onClick={onToggleDesktop}
                className="hidden lg:flex p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                title="Hide sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="px-4 py-3.5 border-b border-white/10">
          <div className="section-label mb-2">Signed in as</div>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-heading font-black text-sm text-white shrink-0"
              style={{ background: 'rgba(249,115,22,0.25)', border: '1.5px solid rgba(249,115,22,0.4)' }}
            >
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <div className="font-heading font-bold text-sm text-white truncate">{user?.name}</div>
              <div className="text-[11px] font-mono text-white/40">{user?.employee_id}</div>
            </div>
          </div>
          <div className="mt-2">
            <span className={`text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded-full border ${roleBadgeColor}`}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-white/10 text-[10px] text-white/25 text-center font-mono">
          Pixel Ads &copy; {new Date().getFullYear()}
        </div>
      </aside>
    </>
  );
};
