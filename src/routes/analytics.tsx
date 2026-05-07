import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, TrendingUp, ShieldCheck, Wallet as WalletIcon } from "lucide-react";

export const Route = createFileRoute("/analytics")({ component: AnalyticsPage });

function AnalyticsPage() {
  return (
    <div className="min-h-screen mx-auto max-w-md px-5 pt-5 pb-32">
      <header className="flex items-center gap-3 mb-5">
        <Link to="/wallet" className="glass h-10 w-10 rounded-full flex items-center justify-center"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-bold">Analytics</h1>
      </header>

      <div className="glass-strong rounded-3xl p-6 shadow-soft text-center">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Credit Score</p>
        <h2 className="text-6xl font-bold mt-2 bg-gradient-to-br from-emerald-500 to-teal-600 bg-clip-text text-transparent">742</h2>
        <p className="text-sm text-muted-foreground mt-1">Excellent</p>
        <div className="mt-4 h-2 rounded-full bg-foreground/5 overflow-hidden">
          <div className="h-full w-[74%] rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {[
          { Icon: TrendingUp, label: "30-day spend", value: "$1,284" },
          { Icon: WalletIcon, label: "Total assets", value: "$9,483" },
          { Icon: ShieldCheck, label: "Trust score", value: "98%" },
          { Icon: TrendingUp, label: "Saved", value: "$430" },
        ].map((s) => (
          <div key={s.label} className="glass-strong rounded-2xl p-4 shadow-soft">
            <s.Icon className="h-4 w-4 text-muted-foreground" />
            <p className="mt-2 text-lg font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground text-center">Demo data — full analytics coming soon.</p>
    </div>
  );
}
