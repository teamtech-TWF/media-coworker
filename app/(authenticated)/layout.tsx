import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="flex min-h-screen bg-[#030304]">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0a0a0c] border-r border-slate-800/50 flex flex-col py-6 sticky top-0 h-screen">
        {/* Brand */}
        <div className="px-6 pb-7 mb-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
              🔮
            </div>
            <div>
              <p className="text-lg font-black text-white tracking-tight leading-none">Jellopy</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">Strategist</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-2 py-6 px-3 flex-1">
          {[
            { href: "/", label: "Overview", icon: "📊" },
            { href: "/campaigns", label: "Campaigns", icon: "🚀" },
            { href: "/outputs", label: "Outputs", icon: "📄" },
            { href: "/recommendations", label: "Strategy", icon: "💡" },
            { href: "/settings", label: "Settings", icon: "⚙️" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link group"
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* User Section */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <UserButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-10">
          {children}
        </div>
      </main>
    </div>
  );
}
