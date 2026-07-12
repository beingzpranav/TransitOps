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
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  ];
  return all.filter((item) => item.roles.includes(role));
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  function handleLogout() {
    localStorage.removeItem('transitops_token');
    localStorage.removeItem('transitops_user');
    router.push('/login');
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const navItems = getNavItems(user.role);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[hsl(var(--sidebar-border))]">
        <div className="p-2 rounded-xl bg-blue-500/20">
          <Truck className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <p className="font-bold text-white text-sm">TransitOps</p>
          <p className="text-[10px] text-blue-300/60">Fleet Operations</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn('sidebar-link', isActive && 'active')}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
              {isActive && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="p-3 border-t border-[hsl(var(--sidebar-border))]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0', roleColors[user.role] ?? 'bg-gray-500')}>
            {user.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-blue-300/60 truncate">{roleLabels[user.role] ?? user.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg hover:bg-red-500/20 text-blue-300/60 hover:text-red-400 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
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
        {/* Top bar (mobile) */}
        <header className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-gray-900 text-sm">TransitOps</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
