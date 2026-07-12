'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Truck,
  Users,
  MapPin,
  Wrench,
  Fuel,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Mail,
  Bell,
  Settings,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNotifications, useClearNotifications } from '@/hooks/useNotifications';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

const roleLabels: Record<string, string> = {
  FLEET_MANAGER: 'Fleet Manager',
  DISPATCHER: 'Dispatcher',
  SAFETY_OFFICER: 'Safety Officer',
  FINANCIAL_ANALYST: 'Financial Analyst',
};

const roleColors: Record<string, string> = {
  FLEET_MANAGER: 'bg-blue-500',
  DISPATCHER: 'bg-emerald-500',
  SAFETY_OFFICER: 'bg-amber-500',
  FINANCIAL_ANALYST: 'bg-violet-500',
};

// Role-aware navigation
function getNavItems(role: string) {
  const all = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'] },
    { href: '/dashboard/vehicles', icon: Truck, label: 'Vehicles', roles: ['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'] },
    { href: '/dashboard/drivers', icon: Users, label: 'Drivers', roles: ['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'] },
    { href: '/dashboard/trips', icon: MapPin, label: 'Trips', roles: ['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'] },
    { href: '/dashboard/maintenance', icon: Wrench, label: 'Maintenance', roles: ['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'] },
    { href: '/dashboard/fuel-expenses', icon: Fuel, label: 'Fuel & Expenses', roles: ['FLEET_MANAGER', 'DISPATCHER', 'FINANCIAL_ANALYST'] },
    { href: '/dashboard/reports', icon: BarChart3, label: 'Reports', roles: ['FLEET_MANAGER', 'FINANCIAL_ANALYST', 'SAFETY_OFFICER'] },
    { href: '/dashboard/settings', icon: Settings, label: 'Settings', roles: ['FLEET_MANAGER', 'DISPATCHER', 'SAFETY_OFFICER', 'FINANCIAL_ANALYST'] },
  ];
  return all.filter((item) => item.roles.includes(role));
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data: notifications = [] } = useNotifications();
  const clearNotifications = useClearNotifications();

  // Bell dropdown toggle
  const [bellOpen, setBellOpen] = useState(false);

  // In-app toasts state
  const [prevNotificationsCount, setPrevNotificationsCount] = useState<number | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; triggerEvent: string }[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('transitops_token');
    const userData = localStorage.getItem('transitops_user');
    if (!token || !userData) {
      router.push('/login');
      return;
    }
    try {
      setUser(JSON.parse(userData));
    } catch {
      router.push('/login');
    }
  }, [router]);

  // Monitor notification counts and show toast popup on new email
  useEffect(() => {
    if (prevNotificationsCount === null) {
      setPrevNotificationsCount(notifications.length);
      return;
    }

    if (notifications.length > prevNotificationsCount) {
      const diff = notifications.length - prevNotificationsCount;
      const newItems = notifications.slice(0, diff); // newest items are at the front (unshifted in service)

      newItems.forEach((item) => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message: item.message, triggerEvent: item.triggerEvent }]);

        // Auto remove toast after 4.5 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4500);
      });

      setPrevNotificationsCount(notifications.length);
    } else if (notifications.length !== prevNotificationsCount) {
      setPrevNotificationsCount(notifications.length);
    }
  }, [notifications, prevNotificationsCount]);

  function handleLogout() {
    localStorage.removeItem('transitops_token');
    localStorage.removeItem('transitops_user');
    router.push('/login');
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#ff385c] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#6a6a6a]">Loading...</p>
        </div>
      </div>
    );
  }

  const navItems = getNavItems(user.role);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#dddddd]">
        <div className="p-2 rounded-xl bg-[#ff385c]/10">
          <img src="Transit Ops Logo.png" alt="Logo" className="w-7 h-7" height={50} width={50} />
        </div>
        <div>
          <p className="font-bold text-[#222222] text-sm">TransitOps</p>
          <p className="text-[10px] text-[#6a6a6a]">Fleet Operations</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const isInbox = item.href === '/dashboard/inbox';
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-link', isActive && 'active')}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {isInbox && notifications.length > 0 && (
                <span className="ml-auto bg-[#ff385c] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {notifications.length}
                </span>
              )}
              {isActive && !isInbox && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="p-3 border-t border-[#dddddd]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-[#f7f7f7] border border-[#dddddd]">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', roleColors[user.role] ?? 'bg-gray-500')}>
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#222222] truncate">{user.name}</p>
            <p className="text-xs text-[#6a6a6a] truncate">{roleLabels[user.role] ?? user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-red-50 text-[#6a6a6a] hover:text-[#ff385c] transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#ffffff]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex sidebar w-64 shrink-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative sidebar w-64 flex-col flex">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Unified Top Header Bar */}
        <header className="bg-white border-b border-[#dddddd] px-6 py-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-[#f7f7f7] text-[#222222] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#ff385c]" />
              <span className="font-bold text-[#222222] text-sm lg:text-base tracking-tight">TransitOps Portal</span>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-4 relative">
            {/* Search Bar matching Excalidraw */}
            <div className="hidden md:flex items-center gap-2 bg-[#f7f7f7] border border-[#dddddd] rounded-lg px-2.5 py-1.5 w-60">
              <Search className="w-4 h-4 text-[#6a6a6a]" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-transparent text-xs text-[#222222] outline-none w-full placeholder:text-[#6a6a6a]"
              />
            </div>

            {/* Notification Bell */}
            <button
              onClick={() => setBellOpen(!bellOpen)}
              className="relative p-2 rounded-full hover:bg-[#f7f7f7] text-[#222222] transition-colors cursor-pointer"
              title="Notifications Sandbox"
              id="header-notification-bell"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 bg-[#ff385c] text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* User Profile Badge matching Excalidraw */}
            <div className="flex items-center gap-2 border-l border-[#dddddd] pl-4">
              <span className="text-xs font-semibold text-[#222222] hidden sm:inline">{user.name}</span>
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-wider',
                roleColors[user.role] ?? 'bg-gray-500'
              )}>
                {roleLabels[user.role] ?? user.role}
              </span>
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm border border-white',
                roleColors[user.role] ?? 'bg-gray-500'
              )}>
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
            </div>

            {bellOpen && (
              <>
                {/* Backdrop to dismiss */}
                <div className="fixed inset-0 z-30" onClick={() => setBellOpen(false)} />

                {/* Dropdown Card */}
                <div className="absolute right-0 top-12 w-80 bg-white border border-[#dddddd] shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-md overflow-hidden z-40 animate-fade-in flex flex-col max-h-96">
                  <div className="px-4 py-3 border-b border-[#dddddd] flex items-center justify-between bg-[#f7f7f7]">
                    <span className="text-xs font-bold text-[#222222]">Recent Notifications</span>
                    {notifications.length > 0 && (
                      <button
                        onClick={async () => {
                          await clearNotifications.mutateAsync();
                        }}
                        disabled={clearNotifications.isPending}
                        className="text-[10px] text-[#ff385c] hover:underline cursor-pointer font-semibold disabled:opacity-50"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-[#dddddd]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#6a6a6a]">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((item: any) => (
                        <div key={item.id} className="p-3 hover:bg-[#f7f7f7] transition-colors flex flex-col gap-0.5 text-left">
                          <div className="flex items-center justify-between text-[9px] text-[#6a6a6a]">
                            <span className="font-bold text-[#ff385c] uppercase tracking-wider">{item.triggerEvent}</span>
                            <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-xs font-semibold text-[#222222]">{item.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#ffffff]">
          {children}
        </main>
      </div>

      {/* Floating In-App Toast Notifications Container (Top Right Corner) */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto bg-white border-l-4 border-l-[#ff385c] border border-[#dddddd] shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-md p-4 animate-fade-in flex flex-col gap-1 transition-all duration-200"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#ff385c] uppercase tracking-wider">
                {toast.triggerEvent}
              </span>
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="text-xs text-[#6a6a6a] hover:text-[#222222] transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <p className="text-sm font-semibold text-[#222222]">{toast.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
