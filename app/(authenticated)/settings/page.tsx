import { auth } from "@clerk/nextjs/server";
import { getOrCreateWorkspace, getGoogleAdsIntegration } from "@/lib/db";
import Link from "next/link";

export default async function SettingsPage() {
  const { userId } = auth();
  const workspace = await getOrCreateWorkspace(userId!);
  const integration = await getGoogleAdsIntegration(workspace.id);
  const connected = integration?.status === "active";

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Settings</h1>
      <p style={{ color: "#666", marginBottom: 32 }}>Manage your integrations and workspace.</p>

      {/* Google Ads connection */}
      <Section title="Google Ads Integration">
        {connected ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
              <span style={{ fontWeight: 600, color: "#16a34a" }}>Connected</span>
            </div>
            <p style={{ fontSize: 14, color: "#666", marginBottom: 4 }}>
              Customer ID: <strong>{integration?.google_ads_customer_id}</strong>
            </p>
            <p style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
              Scopes: {integration?.scopes}
            </p>
            <form action="/api/google/disconnect" method="POST">
              <button type="submit" style={{ background: "#fff", border: "1.5px solid #dc2626", color: "#dc2626", borderRadius: 6, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>
                Disconnect Google Ads
              </button>
            </form>
          </div>
        ) : (
          <div>
            <p style={{ color: "#666", fontSize: 14, marginBottom: 16, lineHeight: 1.6 }}>
              Connect your Google Ads account to enable automatic daily reporting.
              We request read-only access to your campaign metrics.
            </p>
            <Link href="/api/google/connect">
              <button className="btn-accent">Connect Google Ads →</button>
            </Link>
          </div>
        )}
      </Section>

      {/* Plan & Retention */}
      <Section title="Plan & Data Retention">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{
            background: workspace.plan === "pro" ? "#dd1d21" : "#e5e7eb",
            color: workspace.plan === "pro" ? "#fff" : "#333",
            padding: "4px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700
          }}>
            {workspace.plan === "pro" ? "Pro" : "Free"}
          </span>
          <span style={{ fontSize: 14, color: "#666" }}>{workspace.retention_days}-day output history</span>
        </div>
        {workspace.plan === "free" && (
          <p style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>
            Free plan includes 7-day output history. Upgrade to Pro for extended retention and more.
          </p>
        )}
      </Section>

      {/* Privacy notice */}
      <Section title="Privacy & Data">
        <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6 }}>
          Media Coworker stores only <strong>aggregate metrics</strong> (spend, clicks, conversions, etc).
          No end-customer PII is stored. Your Google Ads refresh token is encrypted at rest with AES-256-GCM.
          User identity is managed by Clerk.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "24px", border: "1px solid #eee", marginBottom: 20 }}>
      <h2 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{title}</h2>
      {children}
    </div>
  );
}
