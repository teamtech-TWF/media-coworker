import { auth } from "@clerk/nextjs/server";
import { getOrCreateWorkspace, getRecommendations } from "@/lib/db";
import { RecommendationCardWrapper } from "./RecommendationCardWrapper";
import Link from "next/link";

export default async function RecommendationsPage() {
  const { userId } = auth();
  if (!userId) return null;

  const workspace = await getOrCreateWorkspace(userId);
  const isPro = workspace.plan === "pro";
  
  // Free users only see the most recent 3 pending recommendations
  const limit = isPro ? 20 : 3;
  const recommendations = await getRecommendations(workspace.id, limit);

  const pending = recommendations.filter((r: any) => r.status === "pending");
  const history = isPro ? recommendations.filter((r: any) => r.status !== "pending") : [];

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-10">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">AI Strategy Recommendations</h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
              Proactive suggestions from Gemini to improve your Google Ads performance.
            </p>
          </div>
          {!isPro && (
            <Link href="/settings">
              <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-xl font-black text-sm shadow-lg">
                UPGRADE TO PRO
              </button>
            </Link>
          )}
        </div>
      </header>

      {!isPro && (
        <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
          <p className="text-sm text-indigo-700 dark:text-indigo-300 font-bold">
            💡 You're on the Free plan. Upgrade to Pro to unlock confidence scoring, evidence panels, approval workflows, and full recommendation history.
          </p>
        </div>
      )}

      <section className="mb-12">
        <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Pending Recommendations</h2>
        {pending.length === 0 ? (
          <p className="p-10 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-center text-gray-500 font-bold italic">
            No pending recommendations for today.
          </p>
        ) : (
          pending.map((rec: any) => (
            <RecommendationCardWrapper
              key={rec.id}
              recommendation={rec}
              isPro={isPro}
            />
          ))
        )}
      </section>

      {isPro ? (
        history.length > 0 && (
          <section>
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">Recent History</h2>
            <div className="space-y-4">
              {history.map((rec: any) => (
                <RecommendationCardWrapper
                  key={rec.id}
                  recommendation={rec}
                  isPro={isPro}
                />
              ))}
            </div>
          </section>
        )
      ) : (
        <section className="opacity-40 pointer-events-none grayscale">
          <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">History (Pro Only)</h2>
          <div className="p-10 bg-gray-100 rounded-2xl border border-gray-200 text-center">
             <p className="text-sm font-bold text-gray-400">History is restricted to Pro members.</p>
          </div>
        </section>
      )}
    </div>
  );
}
