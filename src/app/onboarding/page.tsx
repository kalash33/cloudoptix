"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Cloud,
  ArrowRight,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { clsx } from "clsx";

type Provider = "aws" | "gcp" | "azure";
type Step = "select" | "instructions" | "credentials" | "test";

const providers = [
  {
    id: "aws" as const,
    name: "Amazon Web Services",
    icon: "🟠",
    description: "Connect using IAM user access keys",
  },
  {
    id: "gcp" as const,
    name: "Google Cloud Platform",
    icon: "🔵",
    description: "Connect using service account JSON key",
  },
  {
    id: "azure" as const,
    name: "Microsoft Azure",
    icon: "🔷",
    description: "Connect using App Registration credentials",
  },
];

const awsInstructions = [
  {
    title: "Sign in to AWS Console",
    description: "Go to the AWS Management Console and sign in with your root or admin credentials.",
    link: "https://console.aws.amazon.com/",
  },
  {
    title: "Enable IAM Access to Billing",
    description: "Go to Account Settings → IAM user and role access to Billing information → Edit → Activate IAM Access. This is required for IAM users to view billing data.",
    link: "https://console.aws.amazon.com/billing/home#/account",
  },
  {
    title: "Navigate to IAM",
    description: "Search for 'IAM' in the services search bar and select Identity and Access Management.",
    link: "https://console.aws.amazon.com/iam/",
  },
  {
    title: "Create New User",
    description: "Click 'Users' → 'Create user'. Name it 'cloudoptix-readonly'. Do NOT enable console access.",
  },
  {
    title: "Attach Permissions",
    description: "Select 'Attach policies directly' and add a custom inline policy with these minimal read-only permissions:",
    code: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CostExplorerReadOnly",
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage",
        "ce:GetCostForecast",
        "ce:GetDimensionValues",
        "ce:GetReservationCoverage",
        "ce:GetReservationUtilization",
        "ce:GetSavingsPlansUtilization",
        "ce:GetSavingsPlansCoverage",
        "ce:GetAnomalies",
        "ce:GetAnomalyMonitors",
        "ce:DescribeCostCategoryDefinition",
        "ce:ListCostCategoryDefinitions"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CostOptimizationHub",
      "Effect": "Allow",
      "Action": [
        "cost-optimization-hub:GetRecommendation",
        "cost-optimization-hub:ListRecommendations",
        "cost-optimization-hub:ListRecommendationSummaries"
      ],
      "Resource": "*"
    }
  ]
}`,
  },
  {
    title: "Create Access Keys",
    description: "After creating the user, go to 'Security credentials' tab and click 'Create access key'. Select 'Third-party service' as the use case.",
  },
  {
    title: "Copy Credentials",
    description: "Copy the Access Key ID and Secret Access Key. You won't be able to see the secret key again! Keep them safe.",
  },
];

const gcpInstructions = [
  {
    title: "Go to Google Cloud Console",
    description: "Navigate to the Google Cloud Console and select your project.",
    link: "https://console.cloud.google.com/",
  },
  {
    title: "Enable Billing Export to BigQuery",
    description: "Go to Billing → Billing export → BigQuery export. Enable Standard usage cost export to a BigQuery dataset.",
  },
  {
    title: "Note Your Dataset",
    description: "Create or note the BigQuery dataset ID where billing data is exported (e.g., 'billing_export').",
  },
  {
    title: "Create Service Account",
    description: "Go to IAM & Admin → Service Accounts → Create Service Account. Name it 'cloudoptix-billing-reader'.",
  },
  {
    title: "Assign Roles",
    description: "Assign these roles to the service account:",
    code: `Required Roles:
• BigQuery Data Viewer
• BigQuery Job User`,
  },
  {
    title: "Create Key",
    description: "Click on the service account → Keys → Add Key → Create new key → JSON. Download the JSON file.",
  },
  {
    title: "Upload Key",
    description: "In the next step, you'll paste the contents of this JSON file.",
  },
];

const azureInstructions = [
  {
    title: "Sign in to Azure Portal",
    description: "Go to the Azure Portal and sign in with your credentials.",
    link: "https://portal.azure.com/",
  },
  {
    title: "Create App Registration",
    description: "Search for 'App registrations' → New registration. Name it 'CloudOptix' and register.",
  },
  {
    title: "Note IDs",
    description: "Copy the Application (client) ID and Directory (tenant) ID from the overview page.",
  },
  {
    title: "Create Client Secret",
    description: "Go to 'Certificates & secrets' → New client secret. Set an expiry and copy the secret value immediately.",
  },
  {
    title: "Get Subscription ID",
    description: "Go to Subscriptions and copy the Subscription ID you want to monitor.",
  },
  {
    title: "Assign Role",
    description: "In your Subscription → Access control (IAM) → Add role assignment:",
    code: `Role: Cost Management Reader
Assign to: The app registration you created`,
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("select");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [currentInstruction, setCurrentInstruction] = useState(0);
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const instructions =
    selectedProvider === "aws"
      ? awsInstructions
      : selectedProvider === "gcp"
      ? gcpInstructions
      : azureInstructions;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider);
    setStep("instructions");
    setCurrentInstruction(0);
    setCredentials({});
    setTestResult(null);
  };

  const handleNextInstruction = () => {
    if (currentInstruction < instructions.length - 1) {
      setCurrentInstruction((prev) => prev + 1);
    } else {
      setStep("credentials");
    }
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
      
      // For demo purposes without auth, we'll test the connection
      const response = await fetch(`${API_URL}/api/accounts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || "demo"}`,
        },
        body: JSON.stringify({
          provider: selectedProvider,
          name: `My ${selectedProvider?.toUpperCase()} Account`,
          credentials,
        }),
      });

      const data = await response.json();

      if (data.connectionTest) {
        setTestResult(data.connectionTest);
      } else if (data.error) {
        setTestResult({ success: false, error: data.error });
      } else {
        setTestResult({ success: true });
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        error: error.message || "Failed to connect to server",
      });
    } finally {
      setIsLoading(false);
      setStep("test");
    }
  };

  const renderCredentialFields = () => {
    switch (selectedProvider) {
      case "aws":
        return (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Access Key ID</label>
              <input
                type="text"
                value={credentials.accessKeyId || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, accessKeyId: e.target.value })
                }
                placeholder="AKIAIOSFODNN7EXAMPLE"
                className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Secret Access Key</label>
              <div className="relative">
                <input
                  type={showSecrets.secretAccessKey ? "text" : "password"}
                  value={credentials.secretAccessKey || ""}
                  onChange={(e) =>
                    setCredentials({ ...credentials, secretAccessKey: e.target.value })
                  }
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowSecrets({ ...showSecrets, secretAccessKey: !showSecrets.secretAccessKey })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                >
                  {showSecrets.secretAccessKey ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--success)]/10 border border-[var(--success)]/20 text-sm text-[var(--foreground-muted)]">
              ✓ CloudOptix will automatically scan all AWS regions to discover your resources and costs.
            </div>
          </>
        );

      case "gcp":
        return (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Project ID</label>
              <input
                type="text"
                value={credentials.projectId || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, projectId: e.target.value })
                }
                placeholder="my-project-123456"
                className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">BigQuery Dataset ID</label>
              <input
                type="text"
                value={credentials.datasetId || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, datasetId: e.target.value })
                }
                placeholder="billing_export"
                className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Service Account JSON Key</label>
              <textarea
                value={credentials.serviceAccountKey || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, serviceAccountKey: e.target.value })
                }
                placeholder='Paste the entire JSON key file contents here...'
                rows={6}
                className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)] font-mono text-sm"
              />
            </div>
          </>
        );

      case "azure":
        return (
          <>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tenant ID (Directory ID)</label>
              <input
                type="text"
                value={credentials.tenantId || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, tenantId: e.target.value })
                }
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client ID (Application ID)</label>
              <input
                type="text"
                value={credentials.clientId || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, clientId: e.target.value })
                }
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Secret</label>
              <div className="relative">
                <input
                  type={showSecrets.clientSecret ? "text" : "password"}
                  value={credentials.clientSecret || ""}
                  onChange={(e) =>
                    setCredentials({ ...credentials, clientSecret: e.target.value })
                  }
                  placeholder="Your client secret value"
                  className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-3 pr-12 focus:outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowSecrets({ ...showSecrets, clientSecret: !showSecrets.clientSecret })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                >
                  {showSecrets.clientSecret ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subscription ID</label>
              <input
                type="text"
                value={credentials.subscriptionId || ""}
                onChange={(e) =>
                  setCredentials({ ...credentials, subscriptionId: e.target.value })
                }
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full bg-[var(--background-secondary)] border border-[var(--glass-border)] rounded-lg px-4 py-3 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] mb-4"
        >
          <ArrowLeft size={16} />
          Back to Settings
        </Link>
        <h1 className="text-3xl font-bold mb-2">Connect Cloud Account</h1>
        <p className="text-[var(--foreground-muted)]">
          Follow the step-by-step instructions to securely connect your cloud account
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-4 mb-8">
        {["Select Provider", "Setup Instructions", "Enter Credentials", "Test Connection"].map(
          (label, index) => {
            const steps: Step[] = ["select", "instructions", "credentials", "test"];
            const isActive = steps.indexOf(step) >= index;
            const isCurrent = steps[index] === step;

            return (
              <div key={label} className="flex items-center">
                <div
                  className={clsx(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--background-secondary)] text-[var(--foreground-muted)]"
                  )}
                >
                  {isActive && !isCurrent ? <Check size={16} /> : index + 1}
                </div>
                <span
                  className={clsx(
                    "ml-2 text-sm hidden sm:inline",
                    isActive ? "text-[var(--foreground)]" : "text-[var(--foreground-muted)]"
                  )}
                >
                  {label}
                </span>
                {index < 3 && (
                  <div
                    className={clsx(
                      "w-8 h-0.5 mx-4",
                      isActive ? "bg-[var(--accent)]" : "bg-[var(--glass-border)]"
                    )}
                  />
                )}
              </div>
            );
          }
        )}
      </div>

      {/* Step Content */}
      <div className="glass-card p-8">
        {step === "select" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6">Select Your Cloud Provider</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => handleProviderSelect(provider.id)}
                  className="p-6 rounded-xl border border-[var(--glass-border)] hover:border-[var(--accent)] hover:bg-[var(--accent)]/5 transition-all text-left group"
                >
                  <div className="text-4xl mb-4">{provider.icon}</div>
                  <h3 className="font-semibold mb-2 group-hover:text-[var(--accent)]">
                    {provider.name}
                  </h3>
                  <p className="text-sm text-[var(--foreground-muted)]">
                    {provider.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "instructions" && selectedProvider && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Step {currentInstruction + 1} of {instructions.length}
              </h2>
              <div className="flex gap-2">
                {instructions.map((_, index) => (
                  <div
                    key={index}
                    className={clsx(
                      "w-2 h-2 rounded-full transition-colors",
                      index <= currentInstruction
                        ? "bg-[var(--accent)]"
                        : "bg-[var(--glass-border)]"
                    )}
                  />
                ))}
              </div>
            </div>

            <div className="p-6 rounded-xl bg-[var(--background-secondary)] border border-[var(--glass-border)]">
              <h3 className="text-lg font-semibold mb-3">
                {instructions[currentInstruction].title}
              </h3>
              <p className="text-[var(--foreground-muted)] mb-4">
                {instructions[currentInstruction].description}
              </p>

              {instructions[currentInstruction].link && (
                <a
                  href={instructions[currentInstruction].link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-[var(--accent)] hover:underline mb-4"
                >
                  Open Link <ExternalLink size={14} />
                </a>
              )}

              {instructions[currentInstruction].code && (
                <div className="relative">
                  <pre className="p-4 rounded-lg bg-[var(--background)] border border-[var(--glass-border)] text-sm overflow-x-auto font-mono">
                    {instructions[currentInstruction].code}
                  </pre>
                  <button
                    onClick={() => handleCopy(instructions[currentInstruction].code || "")}
                    className="absolute top-2 right-2 p-2 rounded bg-[var(--background-secondary)] hover:bg-[var(--glass-border)] transition-colors"
                  >
                    {copied ? <Check size={14} className="text-[var(--success)]" /> : <Copy size={14} />}
                  </button>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => {
                  if (currentInstruction > 0) {
                    setCurrentInstruction((prev) => prev - 1);
                  } else {
                    setStep("select");
                    setSelectedProvider(null);
                  }
                }}
                className="px-6 py-3 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--background-secondary)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNextInstruction}
                className="px-6 py-3 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors inline-flex items-center gap-2"
              >
                {currentInstruction < instructions.length - 1 ? "Next" : "Enter Credentials"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === "credentials" && selectedProvider && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Enter Your Credentials</h2>
            <p className="text-[var(--foreground-muted)]">
              Your credentials are encrypted with AES-256 before storage.
            </p>

            <div className="space-y-4">{renderCredentialFields()}</div>

            <div className="p-4 rounded-lg bg-[var(--info)]/10 border border-[var(--info)]/30 flex items-start gap-3">
              <AlertCircle size={20} className="text-[var(--info)] shrink-0 mt-0.5" />
              <p className="text-sm text-[var(--foreground-muted)]">
                We use read-only permissions and never modify your cloud resources.
                Your credentials are encrypted at rest and only used to fetch billing data.
              </p>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => {
                  setStep("instructions");
                  setCurrentInstruction(instructions.length - 1);
                }}
                className="px-6 py-3 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--background-secondary)] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleTestConnection}
                disabled={isLoading}
                className="px-6 py-3 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Cloud size={16} />
                    Test Connection
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {step === "test" && (
          <div className="space-y-6 text-center py-8">
            {testResult?.success ? (
              <>
                <div className="w-20 h-20 rounded-full bg-[var(--success)]/20 flex items-center justify-center mx-auto">
                  <Check size={40} className="text-[var(--success)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--success)]">
                  Connection Successful!
                </h2>
                <p className="text-[var(--foreground-muted)]">
                  Your {selectedProvider?.toUpperCase()} account is now connected.
                  We&apos;ll start syncing your cost data shortly.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
                >
                  Go to Dashboard <ArrowRight size={16} />
                </Link>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full bg-[var(--danger)]/20 flex items-center justify-center mx-auto">
                  <AlertCircle size={40} className="text-[var(--danger)]" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--danger)]">
                  Connection Failed
                </h2>
                <p className="text-[var(--foreground-muted)]">
                  {testResult?.error || "Unable to connect to your cloud account."}
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => setStep("credentials")}
                    className="px-6 py-3 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--background-secondary)] transition-colors"
                  >
                    Edit Credentials
                  </button>
                  <button
                    onClick={() => {
                      setStep("select");
                      setSelectedProvider(null);
                    }}
                    className="px-6 py-3 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    Try Another Provider
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
