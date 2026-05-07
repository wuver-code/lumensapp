import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, LogOut, Lock, Bell, ShieldCheck, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { PinDialog } from "@/components/PinDialog";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [pinOpen, setPinOpen] = useState(false);

  const Item = ({ Icon, label, onClick, to }: any) => {
    const inner = (
      <div className="flex items-center gap-3 p-4">
        <Icon className="h-4 w-4" />
        <span className="flex-1 text-sm font-semibold">{label}</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    );
    return to ? <Link to={to}>{inner}</Link> : <button onClick={onClick} className="w-full text-left">{inner}</button>;
  };

  return (
    <div className="min-h-screen mx-auto max-w-md px-5 pt-5 pb-32">
      <header className="flex items-center gap-3 mb-5">
        <Link to="/wallet" className="glass h-10 w-10 rounded-full flex items-center justify-center"><ArrowLeft className="h-4 w-4" /></Link>
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

      <div className="glass-strong rounded-3xl divide-y divide-foreground/5 shadow-soft">
        <Item Icon={Lock} label="Change transaction PIN" onClick={() => setPinOpen(true)} />
        <Item Icon={KeyRound} label="Backup encryption keys" to="/keys" />
        <Item Icon={ShieldCheck} label="Privacy & security" to="/profile" />
        <Item Icon={Bell} label="Notifications" onClick={() => {}} />
        <Item Icon={LogOut} label="Sign out" onClick={async () => { await signOut(); navigate({ to: "/auth" }); }} />
      </div>

      <PinDialog open={pinOpen} onClose={() => setPinOpen(false)} onSuccess={() => setPinOpen(false)} title="Set new PIN" />
    </div>
  );
}
