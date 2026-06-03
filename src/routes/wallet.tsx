import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateWallet, getXlmBalance, shortAddress, streamPayments } from "@/lib/wallet";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Banknote, Plus, Repeat } from "lucide-react";
import { CryptoIcon, cryptoMeta } from "@/components/CryptoIcon";
import { PinGate } from "@/components/PinGate";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/wallet")({
  component: () => <PinGate><WalletHub /></PinGate>,
  head: () => ({ meta: [{ title: "Wallet — Lumens" }] }),
});

type Tx = {
  id: string; kind: string; amount: number; currency: string;
  counterparty: string | null; created_at: string; status: string; tx_hash: string | null;
};
type Recipient = { id: string; label: string; address: string; is_favorite: boolean };

const MOCK_FIAT_BAL = 9483.0;
const MOCK_CRYPTO: Record<string, number> = { BTC: 0.012, ETH: 0.5, USDT: 250, USDC: 100 };

function WalletHub() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [xlm, setXlm] = useState(0);
  const [address, setAddress] = useState("");
  const [txs, setTxs] = useState<Tx[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);

  useEffect(() => {
    if (!user) return;
    const w = getOrCreateWallet();
    setAddress(w.publicKey);
    getXlmBalance(w.publicKey).then(setXlm);
    const stop = streamPayments(w.publicKey, () => getXlmBalance(w.publicKey).then(setXlm));
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setName(data?.display_name ?? ""));
    supabase.from("wallet_transactions").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setTxs((data ?? []) as Tx[]));
    supabase.from("stellar_contacts").select("id,label,address,is_favorite").eq("user_id", user.id)
      .order("is_favorite", { ascending: false }).limit(4)
      .then(({ data }) => setRecipients((data ?? []) as Recipient[]));
    return () => stop();
  }, [user]);

  const totalCrypto = xlm * cryptoMeta("XLM").price
    + Object.entries(MOCK_CRYPTO).reduce((s, [k, v]) => s + v * cryptoMeta(k).price, 0);
  const total = MOCK_FIAT_BAL + totalCrypto;

  const actions = [
    { to: "/wallet/transfer" as const, Icon: ArrowUpRight,    label: "Transfer" },
    { to: "/wallet/deposit"  as const, Icon: ArrowDownLeft,   label: "Deposit" },
    { to: "/wallet/withdraw" as const, Icon: Banknote,        label: "Withdraw" },
    { to: "/wallet/swap"     as const, Icon: ArrowLeftRight,  label: "Swap" },
  ];

  return (
    <>
      <AppHeader title={`Hello ${name || "friend"}`} />
      <div className="min-h-screen mx-auto max-w-md px-5 pt-5 pb-32">

      <section className="text-center py-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Balance</p>
        <h2 className="mt-1 text-5xl font-bold tracking-tight">
          ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>
        <p className="mt-2 text-xs text-muted-foreground font-mono">{shortAddress(address)}</p>
      </section>

      <div className="grid grid-cols-4 gap-3 mt-2 mb-7">
        {actions.map(({ to, Icon, label }) => (
          <Link key={label} to={to} className="flex flex-col items-center gap-2">
            <span className="glass-strong h-14 w-14 rounded-2xl flex items-center justify-center shadow-soft">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="text-[11px] font-semibold">{label}</span>
          </Link>
        ))}
      </div>

      <section className="mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-bold">Recipients</h3>
          <Link to="/contacts" className="text-xs text-muted-foreground">See all</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {recipients.slice(0, 3).map((r) => (
            <Link key={r.id} to="/wallet/transfer" search={{ to: r.address }} className="glass-strong rounded-2xl p-3 shadow-soft">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 ring-2 ring-white/60 flex items-center justify-center text-white font-bold mb-2">
                {r.label.charAt(0).toUpperCase()}
              </div>
              <p className="font-semibold text-sm truncate">{r.label}</p>
              <p className="text-[11px] text-muted-foreground font-mono truncate">{shortAddress(r.address)}</p>
            </Link>
          ))}
          <Link to="/contacts" className="glass rounded-2xl p-3 flex flex-col items-center justify-center text-muted-foreground min-h-[90px]">
            <Plus className="h-5 w-5" />
            <p className="text-xs font-semibold mt-1">Add New</p>
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-bold">Recent Activities</h3>
        </div>
        <div className="glass-strong rounded-3xl p-2 shadow-soft">
          {txs.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No activity yet.</div>
          ) : txs.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-3">
              <div className="h-10 w-10 rounded-full bg-foreground/5 flex items-center justify-center">
                {t.kind === "receive" ? <ArrowDownLeft className="h-4 w-4 text-emerald-600" /> :
                 t.kind === "send" ? <ArrowUpRight className="h-4 w-4 text-rose-500" /> :
                 <Repeat className="h-4 w-4 text-violet-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm capitalize truncate">{t.kind} {t.counterparty ? `· ${shortAddress(t.counterparty)}` : ""}</p>
                <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm">{t.kind === "send" ? "-" : "+"}{t.amount} {t.currency}</p>
                <p className="text-[11px] text-muted-foreground capitalize">{t.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
