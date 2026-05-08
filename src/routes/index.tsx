import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WelcomeSplash } from "@/components/WelcomeSplash";
import { useAuth } from "@/lib/auth";
import { ensureKeypair } from "@/lib/crypto";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateWallet, getXlmBalance } from "@/lib/wallet";
import logo from "@/assets/lumens-logo.png";
import { Bell, Settings, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Banknote, MessageCircle, Wallet, ScanLine } from "lucide-react";
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
  const [avatar, setAvatar] = useState<string | null>(null);
  const [xlm, setXlm] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { publicKey } = await ensureKeypair();
      await supabase.from("profiles").update({ public_key: publicKey }).eq("id", user.id);
    })();
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle()
      .then(({ data }) => { setName(data?.display_name ?? ""); setAvatar(data?.avatar_url ?? null); });
    const w = getOrCreateWallet();
    getXlmBalance(w.publicKey).then(setXlm);
  }, [user]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

      {/* Sticky header with center logo that shrinks on scroll */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-background/60">
        <div className="mx-auto max-w-md px-5 pt-4 pb-3 flex items-center justify-between">
          <Link to="/profile" aria-label="Profile" className="h-11 w-11 rounded-full glass-strong overflow-hidden flex items-center justify-center ring-2 ring-white/40">
            {avatar
              ? <img src={avatar} alt="me" className="h-full w-full object-cover" />
              : <span className="font-bold">{(name || "?").charAt(0).toUpperCase()}</span>}
          </Link>
          <img
            src={logo}
            alt="Lumens"
            className={`transition-all duration-300 ease-out w-auto ${scrolled ? "h-9" : "h-16"}`}
          />
          <div className="flex items-center gap-2">
            <button className="glass h-10 w-10 rounded-full flex items-center justify-center relative" aria-label="Notifications">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <Link to="/settings" className="glass h-10 w-10 rounded-full flex items-center justify-center" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="min-h-screen mx-auto max-w-md px-5 pt-2 pb-32">
        <div className="mb-4">
          <p className="text-xs text-muted-foreground">Welcome back</p>
          <h1 className="text-2xl font-bold leading-tight">Hello {name || "friend"} 👋</h1>
        </div>

        <section className="glass-strong rounded-3xl text-center py-7 shadow-soft mb-6">
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

        <div className="glass-strong rounded-2xl p-5 text-sm text-muted-foreground text-center shadow-soft">
          🔒 End-to-end encrypted messaging · Non-custodial Stellar wallet
        </div>
      </div>
    </>
  );
}
