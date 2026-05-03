import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WelcomeSplash } from "@/components/WelcomeSplash";
import { ModeToggle, type Mode } from "@/components/ModeToggle";
import { ChatList } from "@/components/ChatList";
import { WalletView } from "@/components/WalletView";
import { useAuth } from "@/lib/auth";
import logo from "@/assets/lumens-logo.png";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Lumens — secure messaging & crypto wallet" },
      { name: "description", content: "End-to-end messaging with a built-in non-custodial wallet." },
    ],
  }),
});

function Home() {
  const [mode, setMode] = useState<Mode>("chat");
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <WelcomeSplash />;
  }

  return (
    <>
      <WelcomeSplash />
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 pt-6 pb-3">
          <img src={logo} alt="Lumens" className="h-6 w-auto" />
          <ModeToggle mode={mode} onChange={setMode} />
          <button onClick={signOut} className="glass flex h-10 w-10 items-center justify-center rounded-full" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </button>
        </header>
        <main className="mx-auto max-w-md px-5 pb-24 pt-2" key={mode}>
          {mode === "chat" ? <ChatList /> : <WalletView />}
        </main>
      </div>
    </>
  );
}
