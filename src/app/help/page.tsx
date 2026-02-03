"use client";

import {
  HelpCircle,
  Book,
  MessageCircle,
  FileText,
  Video,
  ExternalLink,
  Search,
  ChevronRight,
  Mail,
  Github,
  Twitter,
} from "lucide-react";

const helpCategories = [
  {
    title: "Getting Started",
    icon: Book,
    articles: [
      "Connecting your first cloud account",
      "Understanding your dashboard",
      "Setting up budgets and alerts",
      "Reading your first recommendations",
    ],
  },
  {
    title: "Cloud Integrations",
    icon: ExternalLink,
    articles: [
      "AWS IAM policy setup",
      "GCP service account configuration",
      "Azure app registration guide",
      "Troubleshooting sync issues",
    ],
  },
  {
    title: "Cost Optimization",
    icon: FileText,
    articles: [
      "Understanding rightsizing recommendations",
      "When to use Reserved Instances",
      "Serverless vs. containers decision guide",
      "Commitment management best practices",
    ],
  },
  {
    title: "Technical Guides",
    icon: Video,
    articles: [
      "API documentation",
      "Webhook integrations",
      "Custom report generation",
      "Data export options",
    ],
  },
];

const faqs = [
  {
    question: "How does CloudOptix calculate potential savings?",
    answer:
      "We analyze your resource utilization patterns, compare pricing across providers and commitment options, and use ML models to predict optimal configurations.",
  },
  {
    question: "Is my cloud data secure?",
    answer:
      "Yes. We use read-only access to your cloud accounts, encrypt all data in transit and at rest, and never store your credentials directly.",
  },
  {
    question: "Can I undo recommendations?",
    answer:
      "CloudOptix only provides recommendations - you have full control over implementation. We never make changes to your infrastructure automatically.",
  },
  {
    question: "How often is data synced?",
    answer:
      "Cost data is synced every 4 hours by default. You can trigger manual syncs anytime or configure more frequent updates on Pro plans.",
  },
];

export default function HelpPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">How can we help?</h1>
        <p className="text-[var(--foreground-muted)] mb-6">
          Search our documentation or browse common topics
        </p>

        <div className="max-w-xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--foreground-muted)]" />
          <input
            type="text"
            placeholder="Search documentation..."
            className="input pl-12 text-lg py-4"
          />
        </div>
      </div>

      {/* Help Categories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {helpCategories.map((category) => (
          <div key={category.title} className="glass-card p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[var(--primary-subtle)]">
                <category.icon className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <h3 className="text-lg font-semibold">{category.title}</h3>
            </div>

            <ul className="space-y-2">
              {category.articles.map((article) => (
                <li key={article}>
                  <a
                    href="#"
                    className="flex items-center justify-between p-2 -mx-2 rounded-lg hover:bg-[var(--surface)] transition-colors text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
                  >
                    <span className="text-sm">{article}</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* FAQs */}
      <div className="glass-card p-6 mb-12 animate-fade-in">
        <h3 className="text-lg font-semibold mb-6">Frequently Asked Questions</h3>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <details
              key={index}
              className="group p-4 rounded-xl bg-[var(--surface)] border border-[var(--glass-border)]"
            >
              <summary className="flex items-center justify-between cursor-pointer font-medium">
                {faq.question}
                <ChevronRight className="w-5 h-5 text-[var(--foreground-muted)] transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-sm text-[var(--foreground-muted)]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>

      {/* Contact Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 text-center animate-fade-in">
          <div className="p-3 rounded-xl bg-[var(--primary-subtle)] w-fit mx-auto mb-4">
            <MessageCircle className="w-6 h-6 text-[var(--primary)]" />
          </div>
          <h4 className="font-semibold mb-2">Live Chat</h4>
          <p className="text-sm text-[var(--foreground-muted)] mb-4">
            Chat with our support team in real-time
          </p>
          <button className="btn btn-primary w-full">Start Chat</button>
        </div>

        <div className="glass-card p-6 text-center animate-fade-in">
          <div className="p-3 rounded-xl bg-[var(--info-subtle)] w-fit mx-auto mb-4">
            <Mail className="w-6 h-6 text-[var(--info)]" />
          </div>
          <h4 className="font-semibold mb-2">Email Support</h4>
          <p className="text-sm text-[var(--foreground-muted)] mb-4">
            Get help via email within 24 hours
          </p>
          <button className="btn btn-secondary w-full">Send Email</button>
        </div>

        <div className="glass-card p-6 text-center animate-fade-in">
          <div className="p-3 rounded-xl bg-[var(--surface)] w-fit mx-auto mb-4">
            <Github className="w-6 h-6" />
          </div>
          <h4 className="font-semibold mb-2">Community</h4>
          <p className="text-sm text-[var(--foreground-muted)] mb-4">
            Join discussions on GitHub
          </p>
          <button className="btn btn-secondary w-full">
            View GitHub
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
