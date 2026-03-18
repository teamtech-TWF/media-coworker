import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const { userId } = auth();
  if (userId) redirect("/app");

  return (
    <div style={{ minHeight: "100vh", background: "#fff" }}>
      {/* Nav */}
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 40px", borderBottom: "1px solid #eee" }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: "#dd1d21" }}>Media Coworker</span>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href="/sign-in"><button className="btn-ghost">Sign In</button></Link>
          <Link href="/sign-up"><button className="btn-accent">Get Started</button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ textAlign: "center", padding: "100px 20px 60px" }}>
        <h1 style={{ fontSize: "clamp(36px,6vw,68px)", fontWeight: 900, lineHeight: 1.1, maxWidth: 800, margin: "0 auto 24px" }}>
          Daily intelligence for <span style={{ color: "#dd1d21" }}>media teams</span>
        </h1>
        <p style={{ fontSize: 20, color: "#555", maxWidth: 560, margin: "0 auto 40px", lineHeight: 1.6 }}>
          Connect your Google Ads account and get three AI-crafted daily outputs: Performance Pulse, Budget Adjustments, and Client Updates — every morning, automatically.
        </p>
        <Link href="/sign-up">
          <button className="btn-accent" style={{ fontSize: 18, padding: "14px 36px" }}>
            Start free →
          </button>
        </Link>
      </section>

      {/* Features */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 24, maxWidth: 900, margin: "0 auto 80px", padding: "0 24px" }}>
        {[
          { icon: "📊", title: "Performance Pulse", desc: "Daily summary of key metrics with causes, actions, and guardrails." },
          { icon: "💰", title: "Budget & Flighting", desc: "Automated spend reallocation suggestions with rationale." },
          { icon: "📧", title: "Client Updates", desc: "Ready-to-send email summaries for your clients in seconds." },
        ].map((f) => (
          <div key={f.title} style={{ background: "#f8f8f8", borderRadius: 12, padding: "28px 24px", border: "1px solid #eee" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>{f.icon}</div>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{f.title}</h3>
            <p style={{ color: "#666", lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "24px", color: "#999", borderTop: "1px solid #eee", fontSize: 14 }}>
        © {new Date().getFullYear()} Media Coworker · Built for media professionals
      </footer>
    </div>
  );
}
