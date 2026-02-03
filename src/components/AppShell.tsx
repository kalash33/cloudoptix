'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

// Pages where sidebar should not be shown
const noSidebarPaths = ['/login', '/register', '/forgot-password'];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  
  const showSidebar = isAuthenticated && !noSidebarPaths.some(path => pathname?.startsWith(path));

  return (
    <ProtectedRoute>
      {showSidebar && <Sidebar />}
      <main className={showSidebar ? "main-content" : ""}>
        {children}
      </main>
    </ProtectedRoute>
  );
}
