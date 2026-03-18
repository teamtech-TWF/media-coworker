import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Media Coworker",
  description: "AI-powered daily outputs for media teams",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <script src="https://cdn.tailwindcss.com" async></script>
          <style>{`
            :root { --accent: #dd1d21; }
            .btn-accent { background: #dd1d21; color: white; border-radius: 6px; padding: 8px 18px; font-weight: 600; cursor: pointer; border: none; transition: opacity .15s; }
            .btn-accent:hover { opacity: 0.88; }
            .btn-ghost { background: transparent; border: 1.5px solid #dd1d21; color: #dd1d21; border-radius: 6px; padding: 8px 18px; font-weight: 600; cursor: pointer; transition: background .15s; }
            .btn-ghost:hover { background: #dd1d2115; }
          `}</style>
        </head>
        <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8f8f8" }}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
