import { createFileRoute, Link } from "@tanstack/react-router";
import { ChatList } from "@/components/ChatList";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, PenSquare } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";

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
    <>
      <AppHeader
        title="Chats"
        subRow={
          <>
            <Link
              to="/find"
              aria-label="Find people"
              className="relative h-11 w-11 rounded-full glass flex items-center justify-center active:scale-95 transition"
            >
              <UserPlus className="h-6 w-6" />
              {pending > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-background">
                  {pending > 9 ? "9+" : pending}
                </span>
              )}
            </Link>
            <Link
              to="/find"
              aria-label="New chat"
              className="h-11 w-11 rounded-full glass flex items-center justify-center active:scale-95 transition"
            >
              <PenSquare className="h-6 w-6" />
            </Link>
          </>
        }
      />
      <div className="min-h-screen mx-auto max-w-md px-5 pt-5 pb-32">
        <ChatList />
      </div>
    </>
  );
}
