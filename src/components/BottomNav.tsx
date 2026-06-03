import { Link, useRouterState } from "@tanstack/react-router";
import { Home, MessageCircle, ScanLine, Wallet, User } from "lucide-react";
import { useAuth } from "@/lib/auth";

export function BottomNav() {
  const { user } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  if (!user) return null;
  if (path.startsWith("/auth") || path.startsWith("/reset-password") || path.startsWith("/chat/")) return null;

  const tabs = [
    { id: "home",    to: "/" as const,        Icon: Home },
    { id: "chat",    to: "/chat" as const,    Icon: MessageCircle },
    { id: "scan",    to: "/scan" as const,    Icon: ScanLine, center: true },
    { id: "wallet",  to: "/wallet" as const,  Icon: Wallet },
    { id: "profile", to: "/profile" as const, Icon: User },
  ];

  const isActive = (to: string) => (to === "/" ? path === "/" : path.startsWith(to));

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 pointer-events-none">
      <div className="mx-auto max-w-md px-4 pb-4 pointer-events-auto">
        <nav className="glass-strong rounded-full shadow-glass flex items-center justify-around px-3 py-2.5 backdrop-blur-2xl">
          {tabs.map(({ id, to, Icon, center }) => {
            const active = isActive(to);
            return (
              <Link
                key={id}
                to={to}
                aria-label={id}
                className={`relative flex items-center justify-center rounded-full transition ${
                  center
                    ? "bg-foreground text-background -mt-6 shadow-glass h-14 w-14"
                    : active
                      ? "bg-foreground/10 text-foreground h-12 w-12"
                      : "text-muted-foreground hover:text-foreground h-12 w-12"
                }`}
              >
                <Icon className={center ? "h-6 w-6" : "h-5 w-5"} strokeWidth={1.75} />
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
