import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Repeat, ShoppingBag, Sparkles, Copy, Check, Loader2, BookUser, Coins } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getOrCreateWallet, getAllBalances, shortAddress, fundTestnet, streamPayments,
  NETWORK_LABEL, type AssetBalance,
} from "@/lib/wallet";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

const XLM_PRICE = 0.12;

type Tx = {
  id: string; kind: string; amount: number; currency: string;
  counterparty: string | null; created_at: string; status: string; tx_hash: string | null;
};

export function WalletView() {
  const { user } = useAuth();
  const [balances, setBalances] = useState<AssetBalance[]>([]);
  const [address, setAddress] = useState("");
  const [copied, setCopied] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [funding, setFunding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async (addr: string) => {
    setRefreshing(true);
    setBalances(await getAllBalances(addr));
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    const w = getOrCreateWallet();
    setAddress(w.publicKey);
    supabase.from("profiles").update({ wallet_address: w.publicKey }).eq("id", user.id);
    refresh(w.publicKey);

    // Realtime: stream Stellar payments
    const stop = streamPayments(w.publicKey, () => {
      refresh(w.publicKey);
      toast.success("Wallet updated");
    });
    // Periodic safety net
    const iv = setInterval(() => refresh(w.publicKey), 20000);
    // Refresh on tab focus
    const onFocus = () => refresh(w.publicKey);
    window.addEventListener("focus", onFocus);

    supabase.from("wallet_transactions").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setTxs((data ?? []) as Tx[]));

    const txChannel = supabase
      .channel("wallet-tx")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wallet_transactions", filter: `user_id=eq.${user.id}` },
        (p) => setTxs((prev) => [p.new as Tx, ...prev].slice(0, 20)))
      .subscribe();

    return () => {
      stop();
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
      supabase.removeChannel(txChannel);
    };
  }, [user, refresh]);

  const xlm = balances.find((b) => b.code === "XLM")?.balance ?? 0;
  const value = xlm * XLM_PRICE;

  const copyAddr = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Address copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const onFund = async () => {
    if (!address) return;
    setFunding(true);
    const ok = await fundTestnet(address);
    if (ok) { toast.success("Funded with 10,000 test XLM"); await refresh(address); }
    else toast.error("Funding failed");
    setFunding(false);
  };

  return (
    <div className="space-y-5">
      <div className="glass-strong relative overflow-hidden rounded-3xl p-6 shadow-soft">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full opacity-50" style={{ background: "var(--gradient-peach)" }} />
        <div className="relative flex items-center gap-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total balance</p>
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-foreground/5">{NETWORK_LABEL}</span>
          {refreshing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        <h1 className="relative mt-2 text-4xl font-bold tracking-tight">
          ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h1>
        <p className="relative mt-1 text-sm text-muted-foreground">{xlm.toLocaleString(undefined, { maximumFractionDigits: 4 })} XLM</p>
        <button onClick={copyAddr} className="relative mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition">
          <span className="font-mono">{shortAddress(address)}</span>
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
        </button>

        <div className="relative mt-5 grid grid-cols-4 gap-2">
          {[
            { icon: ArrowUpRight, label: "Send", to: "/send" as const },
            { icon: ArrowDownLeft, label: "Receive", to: "/receive" as const },
            { icon: BookUser, label: "Contacts", to: "/contacts" as const },
            { icon: Coins, label: "Tokens", to: "/trustlines" as const },
          ].map(({ icon: Icon, label, to }) => (
            <Link key={label} to={to} className="flex flex-col items-center gap-1.5 rounded-2xl bg-foreground/5 hover:bg-foreground hover:text-background py-3 transition">
              <Icon className="h-4 w-4" />
              <span className="text-[11px] font-semibold">{label}</span>
            </Link>
          ))}
        </div>

        {NETWORK_LABEL.includes("Testnet") && xlm === 0 && (
          <button onClick={onFund} disabled={funding}
            className="relative mt-4 inline-flex items-center gap-2 rounded-full bg-foreground text-background text-xs font-semibold px-4 py-2 disabled:opacity-50">
            {funding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Fund testnet wallet
          </button>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold px-1">Assets</h2>
        <div className="glass-strong rounded-3xl p-2 shadow-soft">
          {balances.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">No assets yet.</div>
          )}
          {balances.map((b) => {
            const k = b.issuer ? `${b.code}:${b.issuer}` : b.code;
            const px = b.code === "XLM" ? XLM_PRICE : b.code.startsWith("USD") ? 1 : 0;
            return <AssetRow key={k} sym={b.code} name={b.issuer ? `Issued · ${shortAddress(b.issuer)}` : "Stellar Lumens"}
              price={px} bal={b.balance} value={b.balance * px} color="from-fuchsia-400 to-violet-500" />;
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold px-1">Recent activity</h2>
        <div className="glass-strong rounded-3xl p-2 shadow-soft">
          {txs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No activity yet.</div>
          ) : (
            txs.map((t) => {
              const Inner = (
                <div className="flex items-center gap-3 p-3">
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
              );
              return t.tx_hash
                ? <Link key={t.id} to="/tx/$hash" params={{ hash: t.tx_hash }} className="block hover:bg-foreground/5 rounded-2xl">{Inner}</Link>
                : <div key={t.id}>{Inner}</div>;
            })
          )}
        </div>
      </div>
    </div>
  );
}

function AssetRow({ sym, name, price, bal, value, color }: any) {
  return (
    <div className="flex w-full items-center gap-3 rounded-2xl p-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${color} text-xs font-bold text-white shadow-sm`}>
        {sym.slice(0, 4)}
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-semibold truncate">{sym}</p>
        <p className="text-xs text-muted-foreground truncate">{bal.toFixed(4)} {sym} · {name}</p>
      </div>
      <div className="text-right">
        <p className="font-semibold">${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        {price === 0 && <p className="text-[10px] text-muted-foreground">no price</p>}
      </div>
    </div>
  );
}
