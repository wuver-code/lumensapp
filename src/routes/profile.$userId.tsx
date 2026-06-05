import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Avatar";
import { AppHeader } from "@/components/AppHeader";

export const Route = createFileRoute("/profile/$userId")({ component: ContactProfile });

type ContactProfile = {
  id: string;
  display_name: string | null;
  username: string | null;
  phone: string | null;
  wallet_address: string | null;
  avatar_url: string | null;
};

function ContactProfile() {
  const { userId } = useParams({ from: "/profile/$userId" });
  const { user } = useAuth();
  const [p, setP] = useState<ContactProfile | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ok } = await supabase.rpc("are_contacts", { _a: user.id, _b: userId });
      if (!ok) { setAllowed(false); setLoading(false); return; }
      setAllowed(true);
      // contact_profile_view omits date_of_birth / email by design
      const { data } = await (supabase as any)
        .from("contact_profile_view")
        .select("id, display_name, username, phone, wallet_address, avatar_url")
        .eq("id", userId)
        .maybeSingle();
      setP((data as ContactProfile | null) ?? null);
      setLoading(false);
    })();
  }, [user, userId]);

  return (
    <>
      <AppHeader
        title="Profile"
        rightActions={
          <Link to="/" className="glass h-10 w-10 rounded-full flex items-center justify-center" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        }
      />
      <div className="mx-auto max-w-md px-5 pt-5 pb-32">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-10">Loading…</p>
        ) : !allowed ? (
          <div className="glass-strong rounded-3xl p-8 text-center shadow-soft">
            <p className="font-semibold mb-1">Private profile</p>
            <p className="text-sm text-muted-foreground">You must be confirmed contacts to view this profile.</p>
          </div>
        ) : !p ? (
          <p className="text-center text-sm text-muted-foreground py-10">Profile not found.</p>
        ) : (
          <>
            <div className="glass-strong rounded-3xl p-6 shadow-soft flex flex-col items-center text-center">
              <Avatar url={p.avatar_url} name={p.display_name} size={96} />
              <h2 className="mt-3 text-xl font-bold">{p.display_name ?? p.username ?? "seyo! user"}</h2>
              {p.username && <p className="text-sm text-muted-foreground">@{p.username}</p>}
            </div>

            <div className="glass-strong rounded-3xl p-5 mt-5 shadow-soft space-y-3 text-sm">
              <Row label="Phone" value={p.phone} />
              <Row label="Stellar wallet" value={p.wallet_address} mono />
            </div>

            <Link
              to="/find"
              className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-foreground text-background font-semibold py-3.5"
            >
              <MessageCircle className="h-4 w-4" /> Open chat
            </Link>
          </>
        )}
      </div>
    </>
  );
}

function Row({ label, value, mono }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-0.5 ${mono ? "font-mono text-xs break-all" : ""}`}>{value || <span className="text-muted-foreground">Not set</span>}</p>
    </div>
  );
}
