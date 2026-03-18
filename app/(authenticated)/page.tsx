import { auth } from "@clerk/nextjs/server";
import { getOrCreateWorkspace, getGoogleAdsIntegration, getLastJobRun } from "@/lib/db";
import Link from "next/link";

export default async function OverviewPage() {
  const { userId } = auth();
  const workspace = await getOrCreateWorkspace(userId!);
  const integration = await getGoogleAdsIntegration(workspace.id);
  const lastRun = await getLastJobRun(workspace.id);

  const connected = integration?.status === "active";
  const statusColors: Record<string, string> = {
    success: "bg-twf-green text-twf-green-dark bg-opacity-10",
    error: "bg-twf-red text-twf-red bg-opacity-10",
    running: "bg-twf-orange text-twf-orange bg-opacity-10",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">Workspace Overview</h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          Everything is looking good. Here is your current automation status.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Connection Status */}
        <Card title="Google Ads Connection" icon="🔗">
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <div className={`w-3.5 h-3.5 rounded-full ${connected ? "bg-twf-green shadow-[0_0_8px_rgba(0,208,132,0.5)]" : "bg-twf-red"}`} />
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {connected ? "Active" : "Disconnected"}
              </span>
            </div>
            {!connected && (
              <Link href="/settings">
                <button className="btn-accent text-sm py-1.5">Connect</button>
              </Link>
            )}
          </div>
          {connected && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Customer ID</p>
              <code className="text-sm font-mono font-bold text-twf-blue">{integration?.google_ads_customer_id}</code>
            </div>
          )}
        </Card>

        {/* Last Activity */}
        <Card title="Latest Automation" icon="⚡️">
          {lastRun ? (
            <div className="mt-2">
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${statusColors[lastRun.status] || "bg-gray-100"}`}>
                  {lastRun.status}
                </span>
                <span className="text-xs text-gray-500 font-medium italic">
                  {new Date(lastRun.started_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-4 leading-relaxed">
                Last run was a <strong>{lastRun.job_type}</strong> sync at {new Date(lastRun.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              </p>
              {lastRun.error_message && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 text-[10px] text-red-600 dark:text-red-400 rounded border border-red-100 dark:border-red-800">
                  {lastRun.error_message}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic mt-2">No activity recorded yet.</p>
          )}
        </Card>

        {/* Subscription Plan */}
        <Card title="Workspace Tier" icon="💎">
          <div className="mt-2">
            <div className="flex items-center gap-3">
              <span className={`px-4 py-1.5 rounded-xl text-sm font-black uppercase tracking-tighter ${
                workspace.plan === "pro"
                  ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600"
              }`}>
                {workspace.plan === "pro" ? "Pro Member" : "Free Plan"}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-5 leading-snug">
              Your data is retained for <strong>{workspace.retention_days} days</strong>.
            </p>
          </div>
        </Card>
      </div>

      {/* Primary Actions */}
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-sm">
        <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
          <span>🚀</span> Quick Actions
        </h2>
        <div className="flex flex-wrap gap-4">
          {connected && <RunNowButton workspaceId={workspace.id} />}
          <Link href="/outputs">
            <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all shadow-sm">
              <span>📂</span> View Reports
            </button>
          </Link>
          <Link href="/recommendations">
            <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all shadow-sm">
              <span>💡</span> View Strategy
            </button>
          </Link>
          <Link href="/campaigns">
            <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all shadow-sm">
              <span>📈</span> Campaign Analytics
            </button>
          </Link>
          <Link href="/settings">
            <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl font-bold text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all shadow-sm">
              <span>⚙️</span> Settings
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function RunNowButton({ workspaceId }: { workspaceId: string }) {
  return (
    <form action="/api/jobs/run-now" method="POST">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <button type="submit" className="flex items-center gap-2 px-6 py-3 bg-twf-green text-white rounded-xl font-black shadow-[0_4px_14px_0_rgba(0,208,132,0.39)] hover:bg-twf-green-dark transition-all">
        <span>▶</span> Sync & Generate Now
      </button>
    </form>
  );
}
