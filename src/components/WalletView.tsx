import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Repeat, ShoppingBag, TrendingUp, Copy, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateWallet, getEthBalance, shortAddress } from "@/lib/wallet";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

const ETH_PRICE = 3420; // mocked spot for USD display
const FAKE_ASSETS = [
  { sym: "USDC", name: "USD Coin", price: 1, change: 0.0, bal: 0, color: "from-sky-400 to-blue-500" },
  { sym: "BTC", name: "Bitcoin", price: 92840, change: 2.4, bal: 0, color: "from-amber-400 to-orange-500" },
];

type Tx = {
  id: string;
  kind: string;
  amount: number;
  currency: string;
  counterparty: string | null;
  created_at: string;
  status: string;
};

export function WalletView() {
  const { user } = useAuth();
  const [eth, setEth] = useState(0);
  const [address, setAddress] = useState<`0x${string}`>("0x0" as `0x${string}`);
  const [copied, setCopied] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    if (!user) return;
    const w = getOrCreateWallet();
    setAddress(w.address);
    // persist wallet address to profile (idempotent)
    supabase.from("profiles").update({ wallet_address: w.address }).eq("id", user.id);

    getEthBalance(w.address).then(setEth);

    supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setTxs((data ?? []) as Tx[]));
  }, [user]);

  const ethValue = eth * ETH_PRICE;
  const total = ethValue + FAKE_ASSETS.reduce((a, b) => a + b.bal * b.price, 0);

  const copyAddr = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="glass-strong relative overflow-hidden rounded-3xl p-6 shadow-soft">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-50" style={{ background: "var(--gradient-peach)" }} />
        <p className="relative text-xs uppercase tracking-widest text-muted-foreground">Total balance</p>
        <h1 className="relative mt-2 text-4xl font-bold tracking-tight">
          ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h1>
        <button onClick={copyAddr} className="relative mt-2 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition">
          <span className="font-mono">{shortAddress(address)}</span>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>
        <div className="relative mt-1 inline-flex items-center gap-1 text-sm font-medium text-emerald-600 ml-3">
          <TrendingUp className="h-4 w-4" /> Live
        </div>
        <div className="relative mt-5 grid grid-cols-4 gap-2">
          {[
            { icon: ArrowUpRight, label: "Send", to: "/send" as const },
            { icon: ArrowDownLeft, label: "Receive", to: "/receive" as const },
            { icon: Repeat, label: "Swap", to: "/" as const },
            { icon: ShoppingBag, label: "Buy", to: "/" as const },
          ].map(({ icon: Icon, label, to }) => (
            <Link key={label} to={to} className="flex flex-col items-center gap-1.5 rounded-2xl bg-foreground/5 hover:bg-foreground hover:text-background py-3 transition">
              <Icon className="h-4 w-4" />
              <span className="text-[11px] font-semibold">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold px-1">Assets</h2>
        <div className="glass-strong rounded-3xl p-2 shadow-soft">
          <AssetRow sym="ETH" name="Ethereum" price={ETH_PRICE} bal={eth} value={ethValue} change={0} color="from-indigo-400 to-violet-500" />
          {FAKE_ASSETS.map((a) => (
            <AssetRow key={a.sym} sym={a.sym} name={a.name} price={a.price} bal={a.bal} value={a.bal * a.price} change={a.change} color={a.color} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold px-1">Recent activity</h2>
        <div className="glass-strong rounded-3xl p-2 shadow-soft">
          {txs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No activity yet.</div>
          ) : (
            txs.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5">
                  {t.kind === "receive" ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" /> :
                   t.kind === "send" ? <ArrowUpRight className="h-4 w-4 text-rose-500" /> :
                   <Repeat className="h-4 w-4 text-violet-500" />}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm capitalize">{t.kind} {t.counterparty ? `· ${shortAddress(t.counterparty)}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-sm">{t.kind === "send" ? "-" : "+"}{t.amount} {t.currency}</p>
                  <p className="text-xs text-muted-foreground capitalize">{t.status}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function AssetRow({ sym, name, price, bal, value, change, color }: any) {
  return (
    <div className="flex w-full items-center gap-3 rounded-2xl p-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${color} text-xs font-bold text-white shadow-sm`}>
        {sym}
      </div>
      <div className="flex-1 text-left">
        <p className="font-semibold">{name}</p>
        <p className="text-xs text-muted-foreground">{bal.toFixed(4)} {sym} · ${price.toLocaleString()}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold">${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        {change !== 0 && (
          <p className={`text-xs font-medium ${change >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
            {change >= 0 ? "+" : ""}{change}%
          </p>
        )}
      </div>
    </div>
  );
}
