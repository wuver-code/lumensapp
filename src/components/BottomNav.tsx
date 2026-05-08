import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, MessageCircle, ScanLine, Wallet, User, BarChart3, Settings as SettingsIcon, LogOut, KeyRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { lockPin } from "@/components/PinGate";

export function BottomNav() {
  const { user, signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // Hide on auth/welcome/chat detail
  if (!user) return null;
  if (path.startsWith("/auth") || path.startsWith("/reset-password") || path.startsWith("/chat/")) return null;

  const tabs = [
    { id: "home",    to: "/" as const,       Icon: Home },
    { id: "chat",    to: "/chat" as const,   Icon: MessageCircle },
    { id: "scan",    to: "/scan" as const,   Icon: ScanLine, center: true },
    { id: "wallet",  to: "/wallet" as const, Icon: Wallet },
  ];

  const isActive = (to: string) => to === "/" ? path === "/" : path.startsWith(to);

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-md px-4 pb-4 pointer-events-auto">
        <div ref={ref} className="relative">
          {/* Profile expansion drawer (slides leftward) */}
          <div
            className={`absolute right-14 bottom-1 flex items-center gap-2 transition-all duration-300 origin-right ${
              open ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-90 translate-x-4 pointer-events-none"
            }`}
          >
            <DrawerBtn onClick={() => { setOpen(false); navigate({ to: "/analytics" }); }} Icon={BarChart3} label="Analytics" />
            <DrawerBtn onClick={() => { setOpen(false); navigate({ to: "/profile" }); }} Icon={User} label="Profile" />
            <DrawerBtn onClick={() => { setOpen(false); navigate({ to: "/keys" }); }} Icon={KeyRound} label="Keys" />
            <DrawerBtn onClick={() => { setOpen(false); navigate({ to: "/settings" }); }} Icon={SettingsIcon} label="Settings" />
            <DrawerBtn onClick={async () => { setOpen(false); await signOut(); navigate({ to: "/auth" }); }} Icon={LogOut} label="Sign out" />
          </div>

          <nav className="glass-strong rounded-full shadow-glass flex items-center justify-around px-3 py-2.5 backdrop-blur-2xl">
            {tabs.map(({ id, to, Icon, center }) => (
              <Link
                key={id}
                to={to}
                className={`relative flex h-12 w-12 items-center justify-center rounded-full transition ${
                  center
                    ? "bg-foreground text-background -mt-6 shadow-glass h-14 w-14"
                    : isActive(to)
                      ? "bg-foreground/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                }`}
                aria-label={id}
              >
                <Icon className={center ? "h-6 w-6" : "h-5 w-5"} strokeWidth={1.75} />
              </Link>
            ))}
            <button
              onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
              className={`relative flex h-12 w-12 items-center justify-center rounded-full transition ${
                open || path.startsWith("/profile") || path.startsWith("/settings") || path.startsWith("/analytics")
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label="Profile menu"
            >
              <User className="h-5 w-5" strokeWidth={1.75} />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

function DrawerBtn({ Icon, label, onClick }: { Icon: any; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass-strong h-11 w-11 rounded-full flex items-center justify-center shadow-soft hover:scale-105 transition"
      aria-label={label}
      title={label}
    >
      <Icon className="h-4.5 w-4.5" strokeWidth={1.75} />
    </button>
  );
}
