'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Truck, Lock, Mail, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Login failed');
        return;
      }

      localStorage.setItem('transitops_token', data.token);
      localStorage.setItem('transitops_user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch {
      setError('Network error — please try again');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo(role: string) {
    const creds: Record<string, { email: string; password: string }> = {
      manager: { email: 'manager@transitops.com', password: 'Password123!' },
      dispatcher: { email: 'dispatch@transitops.com', password: 'Password123!' },
      safety: { email: 'safety@transitops.com', password: 'Password123!' },
      finance: { email: 'finance@transitops.com', password: 'Password123!' },
    };
    const c = creds[role];
    if (c) { setEmail(c.email); setPassword(c.password); }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, hsl(222 47% 8%) 0%, hsl(222 47% 14%) 100%)' }}>
      {/* Left Panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl ">
            <img src="Transit Ops Logo.png" alt="Logo" className="w-7 h-7" height={50} width={50} />
          </div>
          <span className="text-xl font-bold tracking-tight">TransitOps</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Smart Transport<br />
            Operations Platform
          </h1>
          <p className="text-blue-200/70 text-lg leading-relaxed">
            Centralize your fleet management. Track vehicles, dispatch drivers,
            monitor maintenance, and analyze operational costs — all in one place.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-6">
            {[
              { icon: '🚛', label: 'Vehicle Registry', desc: 'Full lifecycle tracking' },
              { icon: '👤', label: 'Driver Management', desc: 'License & compliance' },
              { icon: '🗺️', label: 'Trip Dispatch', desc: 'Smart validation' },
              { icon: '📊', label: 'Analytics', desc: 'Real-time reports' },
            ].map((f) => (
              <div key={f.label} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl mb-2">{f.icon}</div>
                <div className="font-semibold text-sm">{f.label}</div>
                <div className="text-xs text-blue-200/60 mt-0.5">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-200/40 text-sm">© 2026 TransitOps. All rights reserved.</p>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-2 mb-6">
              <Truck className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-gray-900">TransitOps</span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-gray-500 text-sm mb-8">Sign in to your account to continue</p>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <Label htmlFor="email" className="form-label">Email address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@transitops.com"
                    className="pl-10"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password" className="form-label">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            {/* Demo credential quick-fill */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wide">Quick Demo Access</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'manager', label: '🚚 Fleet Manager' },
                  { key: 'dispatcher', label: '📋 Dispatcher' },
                  { key: 'safety', label: '🛡️ Safety Officer' },
                  { key: 'finance', label: '💰 Financial Analyst' },
                ].map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => fillDemo(r.key)}
                    className="text-left px-3 py-2 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50 text-xs text-gray-600 hover:text-blue-700 transition-colors"
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">All demo passwords: <code className="bg-gray-100 px-1 rounded">Password123!</code></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
