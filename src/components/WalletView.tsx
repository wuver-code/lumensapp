import { ArrowDownLeft, ArrowUpRight, Repeat, ShoppingBag, TrendingUp, TrendingDown } from "lucide-react";

const assets = [
  { sym: "BTC", name: "Bitcoin", price: 92840, change: 2.4, bal: 0.182, value: 16896, color: "from-amber-400 to-orange-500" },
  { sym: "ETH", name: "Ethereum", price: 3420, change: -0.8, bal: 1.85, value: 6327, color: "from-indigo-400 to-violet-500" },
  { sym: "USDC", name: "USD Coin", price: 1, change: 0.0, bal: 1240, value: 1240, color: "from-sky-400 to-blue-500" },
  { sym: "SOL", name: "Solana", price: 184, change: 5.2, bal: 12.4, value: 2281, color: "from-fuchsia-400 to-pink-500" },
];

const txs = [
  { type: "in", from: "Maya Chen", amt: "+0.05 ETH", usd: "$171.00", time: "2m" },
  { type: "out", from: "Coffee shop", amt: "-12 USDC", usd: "$12.00", time: "1h" },
  { type: "swap", from: "ETH → USDC", amt: "0.1 ETH", usd: "$342.00", time: "Yesterday" },
];

export function WalletView() {
  const total = assets.reduce((a, b) => a + b.value, 0);
  return (
    <div className="space-y-5">
      {/* Balance hero */}
      <div className="glass-strong relative overflow-hidden rounded-3xl p-6 shadow-soft">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-50"
          style={{ background: "var(--gradient-peach)" }} />
        <p className="relative text-xs uppercase tracking-widest text-muted-foreground">Total balance</p>
        <h1 className="relative mt-2 text-4xl font-bold tracking-tight">
          ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </h1>
        <div className="relative mt-1 inline-flex items-center gap-1 text-sm font-medium text-emerald-600">
          <TrendingUp className="h-4 w-4" /> +$284.12 (1.2%) today
        </div>
        <div className="relative mt-5 grid grid-cols-4 gap-2">
          {[
            { icon: ArrowUpRight, label: "Send" },
            { icon: ArrowDownLeft, label: "Receive" },
            { icon: Repeat, label: "Swap" },
            { icon: ShoppingBag, label: "Buy" },
          ].map(({ icon: Icon, label }) => (
            <button key={label} className="flex flex-col items-center gap-1.5 rounded-2xl bg-foreground/5 hover:bg-foreground hover:text-background py-3 transition">
              <Icon className="h-4 w-4" />
              <span className="text-[11px] font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Assets */}
      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-lg font-bold">Assets</h2>
          <button className="text-xs font-medium text-muted-foreground hover:text-foreground">View all</button>
        </div>
        <div className="glass-strong rounded-3xl p-2 shadow-soft">
          {assets.map((a) => (
            <button key={a.sym} className="flex w-full items-center gap-3 rounded-2xl p-3 hover:bg-accent/40 transition">
              <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${a.color} text-xs font-bold text-white shadow-sm`}>
                {a.sym}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.bal} {a.sym} · ${a.price.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">${a.value.toLocaleString()}</p>
                <p className={`text-xs font-medium inline-flex items-center gap-0.5 ${a.change >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                  {a.change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {a.change >= 0 ? "+" : ""}{a.change}%
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-lg font-bold">Recent activity</h2>
        </div>
        <div className="glass-strong rounded-3xl p-2 shadow-soft">
          {txs.map((t, i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5">
                {t.type === "in" ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" /> :
                 t.type === "out" ? <ArrowUpRight className="h-4 w-4 text-rose-500" /> :
                 <Repeat className="h-4 w-4 text-violet-500" />}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{t.from}</p>
                <p className="text-xs text-muted-foreground">{t.time}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{t.amt}</p>
                <p className="text-xs text-muted-foreground">{t.usd}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
