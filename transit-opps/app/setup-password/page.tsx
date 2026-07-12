'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, Key } from 'lucide-react';
import Image from 'next/image';

function SetupPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-red-50 text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Invalid Link</h1>
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          This password setup link is invalid or has expired. Please contact your manager for a new link.
        </p>
        <Button
          onClick={() => router.push('/login')}
          className="w-full bg-[#ff385c] hover:bg-[#e00b41]"
        >
          Go to Login
        </Button>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/setup-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to set password');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center space-y-5 animate-fade-in">
        <div className="inline-flex p-3 rounded-full bg-emerald-50 text-emerald-500">
          <CheckCircle className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Password Setup Complete!</h1>
          <p className="text-sm text-gray-500 mt-2">
            Your new password has been set. You can now log into your TransitOps account.
          </p>
        </div>
        <Button
          onClick={() => router.push('/login')}
          className="w-full bg-[#ff385c] hover:bg-[#e00b41] font-semibold"
        >
          Proceed to Login
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
      <div className="text-center space-y-1.5 mb-6">
        <h1 className="text-xl font-bold text-gray-900">Set Account Password</h1>
        <p className="text-xs text-gray-500">
          Choose a secure password for your TransitOps account.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="password">New Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            required
            className="pl-9 pr-9"
          />
          <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-gray-400 hover:text-gray-600 absolute right-3 top-3 transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter password"
            required
            className="pl-9 pr-9"
          />
          <Key className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-[#ff385c] hover:bg-[#e00b41] text-xs font-semibold py-2 mt-2 transition-all shadow-sm"
      >
        {loading ? 'Saving...' : 'Set Password'}
      </Button>
    </form>
  );
}

export default function SetupPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <Image
          src="/Transit Ops Logo.png"
          alt="TransitOps Logo"
          width={130}
          height={32}
          priority
          className="mb-6 object-contain"
        />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-gray-100 rounded-3xl sm:px-10">
          <Suspense
            fallback={
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-[#ff385c] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-gray-400">Verifying link...</p>
              </div>
            }
          >
            <SetupPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
