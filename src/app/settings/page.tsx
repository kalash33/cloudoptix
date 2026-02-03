"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Settings,
  User,
  Bell,
  Shield,
  Cloud,
  Key,
  Users,
  CreditCard,
  Moon,
  Sun,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { clsx } from "clsx";
import { accountsApi } from "@/lib/api";
import { getProviderName, getProviderColor } from "@/lib/mockData";

interface CloudAccount {
  _id: string;
  provider: "aws" | "gcp" | "azure";
  name: string;
  accountId?: string;
  status: string;
  lastSync?: string;
  createdAt?: string;
}

const tabs = [
  { id: "general", label: "General", icon: Settings },
  { id: "accounts", label: "Cloud Accounts", icon: Cloud },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "team", label: "Team", icon: Users },
  { id: "billing", label: "Billing", icon: CreditCard },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("accounts");

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-[var(--foreground-muted)]">
          Manage your account, integrations, and preferences
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-56 shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-[var(--primary-subtle)] text-[var(--primary)]"
                    : "text-[var(--foreground-secondary)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                )}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === "general" && <GeneralSettings />}
          {activeTab === "accounts" && <CloudAccountsSettings />}
          {activeTab === "notifications" && <NotificationSettings />}
          {activeTab === "security" && <SecuritySettings />}
          {activeTab === "team" && <TeamSettings />}
          {activeTab === "billing" && <BillingSettings />}
        </div>
      </div>
    </div>
  );
}

function GeneralSettings() {
  const [userName, setUserName] = useState("Loading...");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    // Get user info from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.name || "User");
        setUserEmail(user.email || "");
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-6">Profile</h3>
        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--chart-2)] flex items-center justify-center text-white text-2xl font-bold">
            {userName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <button className="btn btn-secondary mb-2">Change Avatar</button>
            <p className="text-xs text-[var(--foreground-muted)]">
              JPG, PNG or GIF. Max 2MB.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Full Name</label>
            <input
              type="text"
              defaultValue={userName}
              className="input"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Email</label>
            <input
              type="email"
              defaultValue={userEmail}
              className="input"
              disabled
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Company</label>
            <input type="text" placeholder="Your company" className="input" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Role</label>
            <input type="text" placeholder="Your role" className="input" />
          </div>
        </div>

        <button className="btn btn-primary mt-6">Save Changes</button>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-6">Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-[var(--foreground-muted)]">
                Use dark theme across the application
              </p>
            </div>
            <button className="relative w-12 h-6 rounded-full bg-[var(--primary)] transition-colors">
              <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white transition-transform" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Currency</p>
              <p className="text-sm text-[var(--foreground-muted)]">
                Display costs in your preferred currency
              </p>
            </div>
            <select className="select w-32">
              <option>USD ($)</option>
              <option>EUR (€)</option>
              <option>GBP (£)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Timezone</p>
              <p className="text-sm text-[var(--foreground-muted)]">
                Set your local timezone for reports
              </p>
            </div>
            <select className="select w-48">
              <option>Asia/Kolkata (IST)</option>
              <option>America/New_York (EST)</option>
              <option>Europe/London (GMT)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloudAccountsSettings() {
  const [accounts, setAccounts] = useState<CloudAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const result = await accountsApi.getAll();
      if (result.data?.accounts) {
        setAccounts(result.data.accounts);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDelete = async (accountId: string) => {
    if (!confirm("Are you sure you want to remove this cloud account?")) return;
    
    setDeleting(accountId);
    try {
      await accountsApi.delete(accountId);
      setAccounts(accounts.filter(a => a._id !== accountId));
    } catch (error) {
      console.error("Error deleting account:", error);
    } finally {
      setDeleting(null);
    }
  };

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return "Never";
    const date = new Date(lastSync);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Connected Cloud Accounts</h3>
            <p className="text-sm text-[var(--foreground-muted)]">
              Manage your cloud provider integrations
            </p>
          </div>
          <Link href="/onboarding" className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Add Account
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 rounded-full bg-[var(--surface)] flex items-center justify-center mx-auto mb-4">
                <Cloud className="w-8 h-8 text-[var(--foreground-muted)]" />
              </div>
              <h4 className="text-lg font-semibold mb-2">No Cloud Accounts Connected</h4>
              <p className="text-sm text-[var(--foreground-muted)] mb-4">
                Connect your first cloud account to start analyzing your costs and getting optimization recommendations.
              </p>
              <Link href="/onboarding" className="btn btn-primary">
                <Plus className="w-4 h-4" />
                Connect Your First Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div
                key={account._id}
                className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)]"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${getProviderColor(account.provider)}20` }}
                  >
                    <Cloud
                      className="w-6 h-6"
                      style={{ color: getProviderColor(account.provider) }}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{account.name}</h4>
                      <span
                        className={clsx(
                          "badge",
                          account.provider === "aws" && "cloud-aws",
                          account.provider === "gcp" && "cloud-gcp",
                          account.provider === "azure" && "cloud-azure"
                        )}
                      >
                        {getProviderName(account.provider)}
                      </span>
                    </div>
                    {account.accountId && (
                      <p className="text-sm text-[var(--foreground-muted)]">
                        Account ID: {account.accountId}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className={clsx(
                          "w-2 h-2 rounded-full",
                          account.status === "connected"
                            ? "bg-[var(--success)]"
                            : account.status === "error"
                            ? "bg-[var(--danger)]"
                            : "bg-[var(--warning)]"
                        )}
                      />
                      <span className="text-sm capitalize">{account.status}</span>
                    </div>
                    <p className="text-xs text-[var(--foreground-muted)]">
                      Last sync: {formatLastSync(account.lastSync)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="btn btn-ghost p-2" title="Sync now">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                    <button 
                      className="btn btn-ghost p-2 text-[var(--danger)]"
                      onClick={() => handleDelete(account._id)}
                      disabled={deleting === account._id}
                      title="Remove account"
                    >
                      {deleting === account._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Connect</h3>
        <p className="text-sm text-[var(--foreground-muted)] mb-6">
          Add a new cloud provider account with read-only access
        </p>

        <div className="grid grid-cols-3 gap-4">
          <Link 
            href="/onboarding"
            className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] hover:border-[var(--aws)] transition-colors text-center"
          >
            <Cloud className="w-8 h-8 mx-auto mb-2 text-[var(--aws)]" />
            <p className="font-medium">AWS</p>
          </Link>
          <Link 
            href="/onboarding"
            className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] hover:border-[var(--gcp)] transition-colors text-center"
          >
            <Cloud className="w-8 h-8 mx-auto mb-2 text-[var(--gcp)]" />
            <p className="font-medium">Google Cloud</p>
          </Link>
          <Link 
            href="/onboarding"
            className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)] hover:border-[var(--azure)] transition-colors text-center"
          >
            <Cloud className="w-8 h-8 mx-auto mb-2 text-[var(--azure)]" />
            <p className="font-medium">Azure</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-6">Notification Preferences</h3>
      
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-4">Email Notifications</h4>
          <div className="space-y-4">
            {[
              { label: "Budget alerts", description: "When spending exceeds thresholds" },
              { label: "Cost anomalies", description: "Unusual spending patterns detected" },
              { label: "Weekly reports", description: "Summary of your cloud costs" },
              { label: "New recommendations", description: "New optimization opportunities" },
              { label: "Commitment expiry", description: "RI/Savings Plan expiration reminders" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    {item.description}
                  </p>
                </div>
                <button className="relative w-12 h-6 rounded-full bg-[var(--primary)] transition-colors">
                  <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--glass-border)]">
          <h4 className="font-medium mb-4">Slack Integration</h4>
          <button className="btn btn-secondary">
            <ExternalLink className="w-4 h-4" />
            Connect Slack
          </button>
        </div>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-6">Security Settings</h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-[var(--foreground-muted)]">
                Add an extra layer of security
              </p>
            </div>
            <button className="btn btn-secondary">Enable 2FA</button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Change Password</p>
              <p className="text-sm text-[var(--foreground-muted)]">
                Update your password regularly
              </p>
            </div>
            <button className="btn btn-secondary">Update</button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">API Keys</p>
              <p className="text-sm text-[var(--foreground-muted)]">
                Manage your API access tokens
              </p>
            </div>
            <button className="btn btn-secondary">
              <Key className="w-4 h-4" />
              Manage Keys
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-4">Active Sessions</h3>
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-[var(--surface)] flex items-center justify-between">
            <div>
              <p className="font-medium">Current Browser Session</p>
              <p className="text-sm text-[var(--foreground-muted)]">
                This device • Current session
              </p>
            </div>
            <span className="badge badge-success">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamSettings() {
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserName(user.name || "User");
        setUserEmail(user.email || "");
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold">Team Members</h3>
          <p className="text-sm text-[var(--foreground-muted)]">
            Manage who has access to your CloudOptix account
          </p>
        </div>
        <button className="btn btn-primary">
          <Plus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      <div className="space-y-3">
        <div className="p-4 rounded-lg bg-[var(--surface)] flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--chart-2)] flex items-center justify-center text-white font-semibold">
            {userName.substring(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-medium">{userName}</p>
            <p className="text-sm text-[var(--foreground-muted)]">
              {userEmail}
            </p>
          </div>
          <span className="badge badge-info">Owner</span>
        </div>
      </div>
    </div>
  );
}

function BillingSettings() {
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold mb-6">Current Plan</h3>
        
        <div className="p-6 rounded-xl bg-[var(--primary-subtle)] border border-[var(--primary)]/30 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xl font-bold">Free Plan</h4>
              <p className="text-sm text-[var(--foreground-muted)]">
                For startups with &lt;$1K monthly cloud spend
              </p>
            </div>
            <span className="text-2xl font-bold">$0<span className="text-sm font-normal">/mo</span></span>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[var(--success)]" />
              Up to 3 cloud accounts
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[var(--success)]" />
              Basic recommendations
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[var(--success)]" />
              30-day data retention
            </li>
          </ul>
        </div>

        <button className="btn btn-primary w-full">Upgrade to Pro</button>
      </div>
    </div>
  );
}
