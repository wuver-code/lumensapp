import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WelcomeSplash } from "@/components/WelcomeSplash";
import { useAuth } from "@/lib/auth";
import { ensureKeypair } from "@/lib/crypto";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateWallet, getXlmBalance } from "@/lib/wallet";
import logo from "@/assets/lumens-logo.png";
import { Bell, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Banknote, MessageCircle, Wallet, ScanLine } from "lucide-react";
import { cryptoMeta } from "@/components/CryptoIcon";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Lumens — secure messaging & crypto wallet" },
      { name: "description", content: "End-to-end encrypted messaging with a built-in non-custodial Stellar wallet." },
    ],
  }),
});

function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [xlm, setXlm] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { publicKey } = await ensureKeypair();
      await supabase.from("profiles").update({ public_key: publicKey }).eq("id", user.id);
    })();
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setName(data?.display_name ?? ""));
    const w = getOrCreateWallet();
    getXlmBalance(w.publicKey).then(setXlm);
  }, [user]);

  if (loading || !user) return <WelcomeSplash />;

  const total = 9483.0 + xlm * cryptoMeta("XLM").price;

  const tiles = [
    { to: "/wallet/transfer" as const, Icon: ArrowUpRight, label: "Transfer" },
    { to: "/wallet/deposit"  as const, Icon: ArrowDownLeft, label: "Deposit" },
    { to: "/wallet/withdraw" as const, Icon: Banknote, label: "Withdraw" },
    { to: "/wallet/swap"     as const, Icon: ArrowLeftRight, label: "Swap" },
  ];

  return (
    <>
      <WelcomeSplash />
      <div className="min-h-screen mx-auto max-w-md px-5 pt-5 pb-32">
        <header className="flex items-center gap-3 mb-5">
          <img src={logo} alt="Lumens" className="h-10 w-auto" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Welcome Back</p>
            <h1 className="text-xl font-bold leading-tight">Hello {name || "friend"}</h1>
          </div>
          <button className="glass h-10 w-10 rounded-full flex items-center justify-center relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-rose-500" />
          </button>
        </header>

        <section className="text-center py-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total Balance</p>
          <h2 className="mt-1 text-5xl font-bold tracking-tight">
            ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
        </section>

        <div className="grid grid-cols-4 gap-3 mb-7">
          {tiles.map(({ to, Icon, label }) => (
            <Link key={label} to={to} className="flex flex-col items-center gap-2">
              <span className="glass-strong h-14 w-14 rounded-2xl flex items-center justify-center shadow-soft">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="text-[11px] font-semibold">{label}</span>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { to: "/chat" as const, Icon: MessageCircle, label: "Chats" },
            { to: "/wallet" as const, Icon: Wallet, label: "Wallet" },
            { to: "/scan" as const, Icon: ScanLine, label: "Scan" },
          ].map(({ to, Icon, label }) => (
            <Link key={label} to={to} className="glass-strong rounded-2xl p-4 flex flex-col items-center gap-2 shadow-soft">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
              <span className="text-xs font-semibold">{label}</span>
            </Link>
          ))}
        </div>

        <div className="glass rounded-2xl p-5 text-sm text-muted-foreground text-center">
          🔒 End-to-end encrypted messaging · Non-custodial Stellar wallet
        </div>
      </div>
    </>
  );
}
