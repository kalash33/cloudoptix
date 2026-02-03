"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Mail, Lock, User, Building, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    company: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      const endpoint = isSignUp ? "/api/auth/register" : "/api/auth/login";

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isSignUp
            ? formData
            : { email: formData.email, password: formData.password }
        ),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // Store token
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Refresh auth context to update state
      await refreshUser();

      // Redirect to onboarding for new users, dashboard for returning
      if (isSignUp) {
        router.push("/onboarding");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-[var(--chart-2)] pulse-glow">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-bold gradient-text">CloudOptix</span>
            <span className="text-xs text-[var(--foreground-muted)]">
              AI-Powered Cost Optimizer
            </span>
          </div>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold text-center mb-2">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h1>
          <p className="text-[var(--foreground-muted)] text-center mb-6">
            {isSignUp
              ? "Start optimizing your cloud costs today"
              : "Sign in to access your dashboard"}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-[var(--danger)] text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Full Name</label>
                  <div className="relative">
                    <User
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                    />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="John Doe"
                      required
                      className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Company (Optional)</label>
                  <div className="relative">
                    <Building
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                    />
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) =>
                        setFormData({ ...formData, company: e.target.value })
                      }
                      placeholder="Acme Inc."
                      className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-[var(--accent)]"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="you@example.com"
                  required
                  className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg pl-10 pr-12 py-3 focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {isSignUp ? "Creating Account..." : "Signing In..."}
                </>
              ) : (
                <>
                  {isSignUp ? "Create Account" : "Sign In"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[var(--foreground-muted)]">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-[var(--accent)] hover:underline font-medium"
              >
                {isSignUp ? "Sign In" : "Create Account"}
              </button>
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Multi-Cloud", value: "AWS, GCP, Azure" },
            { label: "AI-Powered", value: "Smart Insights" },
            { label: "Secure", value: "AES-256" },
          ].map((feature) => (
            <div key={feature.label} className="p-3 rounded-lg bg-[var(--surface)]">
              <div className="text-xs text-[var(--foreground-muted)]">
                {feature.label}
              </div>
              <div className="text-sm font-medium">{feature.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
