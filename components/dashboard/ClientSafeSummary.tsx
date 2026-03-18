"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter } from "next/navigation";

interface ClientSafeSummaryProps {
  content?: string;
  date?: string;
  isPro?: boolean;
}

export function ClientSafeSummary({ content, date, isPro = false }: ClientSafeSummaryProps) {
  const [isCopying, setIsCopying] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const router = useRouter();

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 2000);
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      await fetch("/api/ai/run-client-report", {
        method: "POST",
        body: JSON.stringify({ type: "client_report_daily" }),
      });
      router.refresh();
    } catch (err) {
      console.error("Failed to regenerate summary:", err);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border-2 border-indigo-600/20 dark:border-indigo-500/10 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Premium Badge */}
      <div className="absolute top-0 right-0">
        <div className={`px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest ${isPro ? "bg-indigo-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-500"}`}>
          {isPro ? "AI Insight" : "Standard Summary"}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📧</span>
        <div>
          <h3 className="text-sm font-black text-gray-900 dark:text-gray-100 uppercase tracking-widest">
            Client-Safe Summary
          </h3>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mt-1">
            Generated on {date || "Recently"}
          </p>
        </div>
      </div>

      <div className="prose prose-sm dark:prose-invert max-w-none mb-8 line-clamp-6 text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
        {content ? (
          <ReactMarkdown>{content}</ReactMarkdown>
        ) : (
          <p className="italic text-gray-400">No summary generated yet. Run a deep scan to get started.</p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={handleCopy}
          disabled={!content}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isCopying ? (
            <><span>✅</span> Copied</>
          ) : (
            <><span>📋</span> Copy to Clipboard</>
          )}
        </button>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="px-6 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-xs text-gray-700 dark:text-gray-100 uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-gray-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>{isRegenerating ? "⏳" : "🔄"}</span> {isRegenerating ? "Working..." : "Regenerate"}
        </button>
      </div>
      
      {/* Decorative accent */}
      <div className="absolute left-0 top-0 w-1 h-full bg-indigo-600/20" />
    </div>
  );
}

