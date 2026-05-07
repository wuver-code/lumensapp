import { supabase } from "@/integrations/supabase/client";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hasPin(userId: string): Promise<boolean> {
  const { data } = await supabase.from("user_pins").select("user_id").eq("user_id", userId).maybeSingle();
  return !!data;
}

export async function setPin(userId: string, pin: string) {
  const pin_hash = await sha256(`${userId}:${pin}`);
  const { error } = await supabase.from("user_pins").upsert({ user_id: userId, pin_hash, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const { data } = await supabase.from("user_pins").select("pin_hash").eq("user_id", userId).maybeSingle();
  if (!data) return false;
  const want = await sha256(`${userId}:${pin}`);
  return data.pin_hash === want;
}
