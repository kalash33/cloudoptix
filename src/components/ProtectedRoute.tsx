'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// Pages that don't require authentication
const publicPaths = ['/login', '/register', '/forgot-password'];

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Skip if still loading auth state
    if (isLoading) return;

    const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));

    // If not authenticated and trying to access protected route
    if (!isAuthenticated && !isPublicPath) {
      router.push('/login');
      return;
    }

    // If authenticated and trying to access login page, redirect to dashboard
    if (isAuthenticated && pathname === '/login') {
      router.push('/');
      return;
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render protected content if not authenticated (and not on public path)
  const isPublicPath = publicPaths.some(path => pathname?.startsWith(path));
  if (!isAuthenticated && !isPublicPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
