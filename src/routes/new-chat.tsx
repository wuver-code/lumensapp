import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/new-chat")({ component: NewChat });

function NewChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState<{ id: string; display_name: string | null }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("id, display_name").neq("id", user.id).limit(50)
      .then(({ data }) => setPeople(data ?? []));
  }, [user]);

  const start = async (otherId: string) => {
    if (!user) return;
    const { data: conv, error } = await supabase
      .from("conversations").insert({ created_by: user.id, is_group: false }).select().single();
    if (error || !conv) return toast.error(error?.message ?? "Failed");
    await supabase.from("conversation_members").insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: otherId },
    ]);
    navigate({ to: "/chat/$id", params: { id: conv.id } });
  };

  return (
    <div className="min-h-screen mx-auto max-w-md px-5 pt-6 pb-24">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="text-2xl font-bold mb-4">New chat</h1>
      <div className="glass-strong rounded-3xl p-2 shadow-soft">
        {people.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">No other users yet. Invite a friend!</div>
        ) : people.map((p) => (
          <button key={p.id} onClick={() => start(p.id)} className="flex w-full items-center gap-3 rounded-2xl p-3 hover:bg-accent/40 text-left">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-300 to-orange-400 ring-2 ring-white/60 flex items-center justify-center text-white font-bold">
              {(p.display_name ?? "?").charAt(0).toUpperCase()}
            </div>
            <span className="font-medium">{p.display_name ?? "Unknown"}</span>
            <Plus className="h-4 w-4 ml-auto text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
}
