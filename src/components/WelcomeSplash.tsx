import { useEffect, useState } from "react";
import logo from "@/assets/lumens-logo.png";

export function WelcomeSplash() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setHidden(true), 2500);
    return () => clearTimeout(t);
  }, []);
  if (hidden) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background animate-splash-out">
      <div className="absolute inset-0 opacity-80"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 50%, oklch(0.88 0.10 45 / 0.45) 0%, transparent 60%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-6">
        <div className="absolute -inset-20 rounded-full animate-logo-glow"
          style={{ background: "radial-gradient(circle, oklch(0.85 0.13 35 / 0.5), transparent 70%)" }}
        />
        <img src={logo} alt="Lumens" className="relative h-20 w-auto animate-logo-rise" />
        <p className="relative text-xs uppercase tracking-[0.4em] text-muted-foreground animate-logo-rise" style={{ animationDelay: "0.3s" }}>
          messaging · wallet
        </p>
      </div>
    </div>
  );
}
