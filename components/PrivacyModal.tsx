"use client";

import { useState } from "react";

export default function PrivacyModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: 13, textDecoration: "underline", padding: 0 }}
      >
        Privacy &amp; Data Policy
      </button>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 32, maxWidth: 520, width: "90%", maxHeight: "80vh", overflowY: "auto" }}>
            <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 16 }}>Privacy &amp; Data Policy</h2>
            <div style={{ fontSize: 14, color: "#444", lineHeight: 1.7 }}>
              <p><strong>What we store:</strong></p>
              <ul>
                <li>Aggregate campaign metrics only: spend, impressions, clicks, conversions, revenue, CTR, CVR, CPA, ROAS.</li>
                <li>No end-customer PII from ad platforms (no names, emails, phone numbers).</li>
                <li>Your Google Ads OAuth2 refresh token, encrypted at rest with AES-256-GCM.</li>
              </ul>
              <p><strong>Your identity:</strong></p>
              <p>Authentication and identity is managed by Clerk. We store only your Clerk user ID as a reference.</p>
              <p><strong>Data retention:</strong></p>
              <p>Free plan: 7-day history. Pro plan: extended retention. You can disconnect your Google Ads account and request data deletion at any time via Settings.</p>
              <p><strong>Third-party services:</strong></p>
              <p>Google Ads API (read-only), Clerk (auth), Supabase (database). No data is sold to third parties.</p>
              <p><strong>PDPA compliance:</strong></p>
              <p>Designed to be PDPA-friendly by avoiding storage of personal data from ad platforms.</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="btn-accent"
              style={{ marginTop: 20, width: "100%" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
