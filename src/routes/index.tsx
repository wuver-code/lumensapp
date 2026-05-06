import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WelcomeSplash } from "@/components/WelcomeSplash";
import { ModeToggle, type Mode } from "@/components/ModeToggle";
import { ChatList } from "@/components/ChatList";
import { WalletView } from "@/components/WalletView";
import { useAuth } from "@/lib/auth";
import { ensureKeypair } from "@/lib/crypto";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/lumens-logo.png";
import { LogOut, UserPlus, KeyRound } from "lucide-react";

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
  const [mode, setMode] = useState<Mode>("chat");
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  // Generate / publish E2EE public key on first sign-in
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { publicKey } = await ensureKeypair();
      await supabase.from("profiles").update({ public_key: publicKey }).eq("id", user.id);
    })();
  }, [user]);

  // Pending incoming contact requests + instant realtime updates
  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      const { count } = await supabase
        .from("contact_requests")
        .select("id", { count: "exact", head: true })
        .eq("to_user", user.id)
        .eq("status", "pending");
      setPendingCount(count ?? 0);
    };
    refresh();
    const ch = supabase
      .channel(`pending-reqs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_requests" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  if (loading || !user) {
    return <WelcomeSplash />;
  }

  return (
    <>
      <WelcomeSplash />
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 mx-auto max-w-md px-5 pt-4 pb-3 space-y-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Lumens" className="h-9 w-auto" />
            <h1 className="text-3xl font-bold">{mode === "chat" ? "Chats" : "Wallet"}</h1>
            <Link
              to="/find"
              className="ml-auto glass flex h-9 w-9 items-center justify-center rounded-full"
              aria-label="Find people"
            >
              <UserPlus className="h-4 w-4" />
            </Link>
            <button
              onClick={signOut}
              className="glass flex h-9 w-9 items-center justify-center rounded-full"
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
          <ModeToggle mode={mode} onChange={setMode} />
        </header>
        <main className="mx-auto max-w-md px-5 pb-24 pt-2" key={mode}>
          {mode === "chat" ? <ChatList /> : <WalletView />}
        </main>
      </div>
    </>
  );
}
