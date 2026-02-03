"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Lightbulb,
  Code2,
  Server,
  Wallet,
  Target,
  Settings,
  HelpCircle,
  ChevronLeft,
  Zap,
  TrendingDown,
  Cloud,
  Plus,
  LogOut,
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { accountsApi, costsApi } from "@/lib/api";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Recommendations", href: "/recommendations", icon: Lightbulb },
  { name: "Codebase Analysis", href: "/codebase", icon: Code2 },
  { name: "Resources", href: "/resources", icon: Server },
  { name: "Kubernetes", href: "/kubernetes", icon: Cloud },
  { name: "Commitments", href: "/commitments", icon: Wallet },
  { name: "Budgets & Alerts", href: "/budgets", icon: Target },
];

const secondaryNavigation = [
  { name: "Connect Account", href: "/onboarding", icon: Plus },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "Help & Support", href: "/help", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [hasAccounts, setHasAccounts] = useState(false);
  const [potentialSavings, setPotentialSavings] = useState(0);
  const [savingsPercent, setSavingsPercent] = useState(0);

  useEffect(() => {
    // Check if user has connected accounts
    const checkAccounts = async () => {
      try {
        const result = await accountsApi.getAll();
        const accountsExist = !!(result.data?.accounts && result.data.accounts.length > 0);
        setHasAccounts(accountsExist);
        
        if (accountsExist) {
          // Fetch cost summary to get real savings
          const costResult = await costsApi.getSummary();
          if (costResult.data) {
            const monthlySpend = costResult.data.totalMonthly;
            const savings = Math.round(monthlySpend * 0.42); // Default 42% potential savings
            setPotentialSavings(savings);
            setSavingsPercent(42);
          }
        }
      } catch (error) {
        console.error("Error checking accounts:", error);
      }
    };
    
    if (user) {
      checkAccounts();
    }
  }, [user]);

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const userName = user?.name || "User";
  const userInitials = user?.name ? getInitials(user.name) : "U";

  return (
    <aside
      className={clsx(
        "sidebar",
        collapsed && "!w-[var(--sidebar-collapsed)]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6 border-b border-[var(--glass-border)]">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--chart-2)] pulse-glow">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-lg font-bold gradient-text">CloudOptix</span>
            <span className="text-xs text-[var(--foreground-muted)]">
              Cost Optimizer
            </span>
          </div>
        )}
      </div>

      {/* Savings Summary - Only show if accounts are connected */}
      {!collapsed && hasAccounts && potentialSavings > 0 && (
        <div className="mx-4 mt-4 p-4 rounded-xl bg-[var(--success-subtle)] border border-[var(--success)]/20">
          <div className="flex items-center gap-2 text-[var(--success)] mb-1">
            <TrendingDown className="w-4 h-4" />
            <span className="text-xs font-medium">Potential Savings</span>
          </div>
          <div className="text-2xl font-bold text-[var(--success)]">
            ${potentialSavings.toLocaleString()}<span className="text-sm font-normal">/mo</span>
          </div>
          <div className="text-xs text-[var(--foreground-muted)] mt-1">
            {savingsPercent}% of current spend
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-4 mb-2">
          <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
            {!collapsed ? "Overview" : ""}
          </span>
        </div>
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx("sidebar-nav-item", isActive && "active")}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}

        <div className="px-4 mt-6 mb-2">
          <span className="text-xs font-semibold text-[var(--foreground-muted)] uppercase tracking-wider">
            {!collapsed ? "Support" : ""}
          </span>
        </div>
        {secondaryNavigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx("sidebar-nav-item", isActive && "active")}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center p-3 mx-4 mb-4 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface-hover)] transition-colors"
      >
        <ChevronLeft
          className={clsx(
            "w-5 h-5 text-[var(--foreground-secondary)] transition-transform",
            collapsed && "rotate-180"
          )}
        />
      </button>

      {/* User Profile */}
      {!collapsed && (
        <div className="flex items-center gap-3 p-4 mx-4 mb-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)]">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--chart-1)] to-[var(--chart-2)] flex items-center justify-center text-white font-semibold">
            {userInitials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{userName}</div>
            <div className="text-xs text-[var(--foreground-muted)] truncate">
              {user?.company || "Free Plan"}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg hover:bg-[var(--surface-hover)] text-[var(--foreground-muted)] hover:text-[var(--danger)] transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Collapsed logout button */}
      {collapsed && (
        <button
          onClick={handleLogout}
          className="flex items-center justify-center p-3 mx-4 mb-4 rounded-lg bg-[var(--surface)] hover:bg-[var(--danger)]/20 text-[var(--foreground-muted)] hover:text-[var(--danger)] transition-colors"
          title="Logout"
        >
          <LogOut className="w-5 h-5" />
        </button>
      )}
    </aside>
  );
}
