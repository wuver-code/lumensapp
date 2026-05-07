import { createFileRoute, Link } from "@tanstack/react-router";
import { ChatList } from "@/components/ChatList";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus } from "lucide-react";
import logo from "@/assets/lumens-logo.png";

export const Route = createFileRoute("/chat")({ component: ChatHome });

function ChatHome() {
  const { user } = useAuth();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!user) return;
    const refresh = async () => {
      const { count } = await supabase.from("contact_requests")
        .select("id", { count: "exact", head: true })
        .eq("to_user", user.id).eq("status", "pending");
      setPending(count ?? 0);
    };
    refresh();
    const ch = supabase.channel(`pending-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_requests" }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <div className="min-h-screen mx-auto max-w-md px-5 pt-5 pb-32">
      <header className="flex items-center gap-3 mb-4">
        <img src={logo} alt="Lumens" className="h-10 w-auto" />
        <h1 className="text-3xl font-bold">Chats</h1>
        <Link to="/find" className="ml-auto glass relative h-10 w-10 rounded-full flex items-center justify-center" aria-label="Find people">
          <UserPlus className="h-4 w-4" />
          {pending > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
              {pending > 9 ? "9+" : pending}
            </span>
          )}
        </Link>
      </header>
      <ChatList />
    </div>
  );
}
