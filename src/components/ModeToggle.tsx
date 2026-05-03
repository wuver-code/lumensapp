import { MessageCircle, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export type Mode = "chat" | "wallet";

export function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="glass-strong inline-flex items-center rounded-full p-1 shadow-soft">
      {([
        { id: "chat" as const, label: "Chat", icon: MessageCircle },
        { id: "wallet" as const, label: "Wallet", icon: Wallet },
      ]).map(({ id, label, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={cn(
              "relative flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all",
              active ? "bg-foreground text-background shadow-md" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
