import { useEffect, useState } from "react";
import logo from "@/assets/lumens-logo.png";

const SHOWN_KEY = "lumens.splashShown";

export function WelcomeSplash() {
  // Only show once per browser session (until tab/app is closed)
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SHOWN_KEY) === "1";
  });

  useEffect(() => {
    if (hidden) return;
    const t = setTimeout(() => {
      sessionStorage.setItem(SHOWN_KEY, "1");
      setHidden(true);
    }, 2500);
    return () => clearTimeout(t);
  }, [hidden]);

  if (hidden) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background animate-splash-out">
      <div
        className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 50%, oklch(0.88 0.10 45 / 0.45) 0%, transparent 60%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-6">
        <div
          className="absolute -inset-24 rounded-full animate-logo-glow"
          style={{ background: "radial-gradient(circle, oklch(0.85 0.13 35 / 0.5), transparent 70%)" }}
        />
        <img src={logo} alt="Lumens" className="relative h-44 w-auto animate-logo-rise" />
        <p
          className="relative text-xs uppercase tracking-[0.4em] text-muted-foreground animate-logo-rise"
          style={{ animationDelay: "0.3s" }}
        >
          messaging · wallet
        </p>
      </div>
    </div>
  );
}
