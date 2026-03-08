// API Client v2 - updated 2026-02-28
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// Get auth token from localStorage
function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}
// Generic fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    console.log(`[apiFetch] Executing fetch against: ${API_URL}${endpoint}`);
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      return { error: data.error || "Request failed" };
    }

    return { data };
  } catch (error: any) {
    return { error: error.message || "Network error" };
  }
}

// Auth API - returns data directly for easier use
export const authApi = {
  register: async (email: string, password: string, name: string, company?: string) => {
    const token = getToken();
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ email, password, name, company }),
    });
    const data = await response.json();
    if (!response.ok) throw { response: { data } };
    return data;
  },

  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await response.json();
    if (!response.ok) throw { response: { data } };
    return data;
  },

  getCurrentUser: async () => {
    const token = getToken();
    if (!token) throw new Error('No token');
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) throw { response: { data } };
    return data;
  },

  getMe: () => apiFetch<{ user: any }>("/api/auth/me"),
};

// Accounts API
export const accountsApi = {
  getAll: () =>
    apiFetch<{
      accounts: Array<{
        id: string;
        provider: "aws" | "gcp" | "azure";
        name: string;
        accountId: string;
        status: "pending" | "connected" | "error" | "syncing";
        lastSyncAt?: string;
        lastSyncError?: string;
      }>;
    }>("/api/accounts"),

  create: (
    provider: "aws" | "gcp" | "azure",
    name: string,
    credentials: Record<string, string>
  ) =>
    apiFetch<{
      account: any;
      connectionTest: { success: boolean; error?: string };
    }>("/api/accounts", {
      method: "POST",
      body: JSON.stringify({ provider, name, credentials }),
    }),

  test: (id: string) =>
    apiFetch<{ success: boolean; error?: string }>(`/api/accounts/${id}/test`, {
      method: "POST",
    }),

  sync: (id: string) =>
    apiFetch<{ success: boolean; message: string; data: { daysProcessed: number; totalCost: number; currency: string } }>(`/api/accounts/${id}/sync`, {
      method: "POST",
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/api/accounts/${id}`, {
      method: "DELETE",
    }),
};

// Costs API
export const costsApi = {
  getSummary: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return apiFetch<{
      totalMonthly: number;
      previousMonthly: number;
      trend: number;
      providers: Array<{
        provider: string;
        name: string;
        currentMonth: number;
        lastMonth: number;
      }>;
    }>(`/api/costs/summary${queryString}`);
  },

  getDaily: (startDate?: string, endDate?: string) => {
    console.log('[API getDaily] Receiving arguments:', { startDate, endDate });
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    console.log('[API getDaily] Built URL:', `/api/costs/daily${queryString}`);

    return apiFetch<{
      data: Array<{
        date: string;
        aws: number;
        gcp: number;
        azure: number;
        total: number;
      }>;
    }>(`/api/costs/daily${queryString}`);
  },

  getServices: () =>
    apiFetch<{
      data: Array<{
        service: string;
        provider: string;
        cost: number;
      }>;
    }>("/api/costs/services"),

  getForecast: () =>
    apiFetch<{
      totalForecast: number;
      forecastByDay: Array<{ date: string; cost: number }>;
    }>("/api/costs/forecast"),

  getServiceDaily: (serviceName: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return apiFetch<{
      data: Array<{ date: string; cost: number }>;
    }>(`/api/costs/services/${encodeURIComponent(serviceName)}/daily${queryString}`);
  },

  getServiceUtilization: (serviceName: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    return apiFetch<{
      serviceName: string;
      metrics: {
        cpu: { avg: number; peak: number; unit: string };
        memory: { avg: number; peak: number; unit: string };
        networkIn: { value: number; unit: string };
        networkOut: { value: number; unit: string };
        diskReadIOPS: { value: number; unit: string };
        diskWriteIOPS: { value: number; unit: string };
      };
      dailyTrend: Array<{
        date: string;
        cpu: number;
        memory: number;
        network: number;
        diskIO: number;
      }>;
    }>(`/api/costs/services/${encodeURIComponent(serviceName)}/utilization${queryString}`);
  },
};

// Recommendations API
export const recommendationsApi = {
  getAll: (params?: { type?: string; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.set("type", params.type);
    if (params?.status) queryParams.set("status", params.status);
    const query = queryParams.toString();

    return apiFetch<{
      recommendations: Array<{
        id: string;
        type: string;
        title: string;
        description: string;
        provider: "aws" | "gcp" | "azure";
        currentCost: number;
        projectedCost: number;
        savings: number;
        savingsPercent: number;
        effort: "low" | "medium" | "high";
        risk: "low" | "medium" | "high";
        status: "active" | "dismissed" | "applied";
        implementationSteps?: string[];
      }>;
      summary: {
        totalCount: number;
        totalSavings: number;
        byType: Record<string, number>;
        currentSpend?: number;
      };
    }>(`/api/recommendations${query ? `?${query}` : ""}`);
  },

  getAnomalies: () => {
    return apiFetch<{ anomalies: any[] }>('/api/recommendations/anomalies');
  },

  getResources: () => {
    return apiFetch<{ resources: any[] }>('/api/recommendations/resources');
  },

  generate: () =>
    apiFetch<{ message: string; generated: number }>(
      "/api/recommendations/generate",
      { method: "POST" }
    ),

  updateStatus: (id: string, status: "active" | "dismissed" | "applied") =>
    apiFetch<{ recommendation: any }>(`/api/recommendations/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
};

// Chat API
export const chatApi = {
  sendMessage: (message: string, conversationHistory: Array<{ role: string; content: string }> = []) =>
    apiFetch<{ reply: string; model: string; usage: any }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationHistory }),
    }),

  analyze: () =>
    apiFetch<{
      summary: string;
      insights: Array<{
        title: string;
        description: string;
        category: string;
        impact: string;
        estimatedSavings: string;
        action: string;
      }>;
      overallScore: number;
    }>('/api/chat/analyze', { method: 'POST' }),
};

// Helper to set token after login
export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
}

// Helper to clear token on logout
export function clearAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
  }
}
