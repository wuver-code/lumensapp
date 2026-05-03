import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { WelcomeSplash } from "@/components/WelcomeSplash";
import { ModeToggle, type Mode } from "@/components/ModeToggle";
import { ChatList } from "@/components/ChatList";
import { WalletView } from "@/components/WalletView";
import logo from "@/assets/lumens-logo.png";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Lumens — secure messaging & crypto wallet" },
      { name: "description", content: "Lumens combines end-to-end encrypted messaging with a non-custodial crypto wallet. Send money as easily as a text." },
    ],
  }),
});

function Home() {
  const [mode, setMode] = useState<Mode>("chat");
  return (
    <>
      <WelcomeSplash />
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 pt-6 pb-3">
          <img src={logo} alt="Lumens" className="h-6 w-auto" />
          <ModeToggle mode={mode} onChange={setMode} />
          <button className="glass flex h-10 w-10 items-center justify-center rounded-full">
            <Bell className="h-4 w-4" />
          </button>
        </header>
        <main className="mx-auto max-w-md px-5 pb-24 pt-2 animate-in fade-in duration-500" key={mode}>
          {mode === "chat" ? <ChatList /> : <WalletView />}
        </main>
      </div>
    </>
  );
}
