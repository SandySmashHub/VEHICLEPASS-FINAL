import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ArrowLeftRight, Bell, Car, FileText, Hexagon, LayoutDashboard, LogOut, Menu, MapPinned, Route, Settings, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Badge } from '../components/ui.jsx';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/live', label: 'Live map', icon: MapPinned },
  { to: '/entry-exit', label: 'Entry & exit', icon: ArrowLeftRight },
  { to: '/vehicles', label: 'Vehicles', icon: Car },
  { to: '/routes', label: 'Route history', icon: Route },
  { to: '/geofence', label: 'Geofencing', icon: Hexagon },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/reports', label: 'Reports', icon: FileText, admin: true },
  { to: '/users', label: 'Users', icon: Users, admin: true },
  { to: '/settings', label: 'Settings', icon: Settings, admin: true },
];

export const Logo = ({ dark }) => (
  <div className="flex items-center gap-2.5">
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden><rect width="32" height="32" rx="8" fill={dark ? '#fff' : '#17633e'} /><path d="M16 5a8 8 0 0 0-8 8c0 6 8 14 8 14s8-8 8-14a8 8 0 0 0-8-8Z" fill={dark ? '#17633e' : '#fff'} /><circle cx="16" cy="13" r="3.2" fill={dark ? '#fff' : '#17633e'} /></svg>
    <span className={`text-lg font-extrabold tracking-tight ${dark ? 'text-white' : 'text-brand-900'}`}>VehiclePass</span>
  </div>
);

export default function AppLayout() {
  const { user, logout, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => !n.admin || isAdmin);

  const sidebar = (
    <nav className="flex h-full flex-col bg-brand-900 px-3 py-5 text-brand-100">
      <div className="mb-7 flex items-center justify-between px-2">
        <Logo dark />
        <button className="rounded p-1 text-brand-200 hover:bg-brand-800 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>
      <ul className="flex-1 space-y-1">
        {items.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink to={to} end={end} onClick={() => setOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-white text-brand-900' : 'text-brand-100 hover:bg-brand-800'}`}>
              <Icon className="h-[18px] w-[18px]" /> {label}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="mt-4 border-t border-brand-800 px-2 pt-4 text-sm">
        <div className="truncate font-semibold text-white">{user?.name}</div>
        <div className="mb-3 mt-1"><Badge value={user?.role} label={user?.role === 'ADMIN' ? 'Admin' : 'Security guard'} /></div>
        <button onClick={logout} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-brand-200 hover:bg-brand-800 hover:text-white"><LogOut className="h-4 w-4" /> Sign out</button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-[1100] lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85%]">{sidebar}</aside>
        </div>
      )}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <Logo />
        <button className="btn-ghost" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></button>
      </header>
      <main className="mx-auto max-w-[1500px] p-4 sm:p-6"><Outlet /></main>
    </div>
  );
}
