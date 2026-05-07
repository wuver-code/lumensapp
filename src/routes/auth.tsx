import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import logo from "@/assets/lumens-logo.png";
import { Mail, Lock, User as UserIcon, Loader2, Phone, AtSign } from "lucide-react";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — Lumens" }] }),
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data: signed, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              display_name: name || email.split("@")[0],
              phone: phone || null,
              username: username || null,
            },
          },
        });
        if (error) throw error;
        // Save phone + username to profile so other people can find this user
        const uid = signed.user?.id;
        if (uid) {
          await supabase.from("profiles").update({
            phone: phone || null,
            username: username ? username.trim().toLowerCase() : null,
            display_name: name || email.split("@")[0],
          }).eq("id", uid);
        }
        toast.success("Check your email to confirm your account.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back ✨");
        navigate({ to: "/" });
      } else if (mode === "otp") {
        if (!otpSent) {
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { shouldCreateUser: true, emailRedirectTo: window.location.origin },
          });
          if (error) throw error;
          setOtpSent(true);
          toast.success("Code sent — check your email.");
        } else {
          const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: "email" });
          if (error) throw error;
          toast.success("Signed in ✨");
          navigate({ to: "/" });
        }
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset email sent.");
        setMode("signin");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="Lumens" className="h-32 w-auto mb-3" />
          <p className="text-sm text-muted-foreground">Messaging meets a wallet.</p>
        </div>

        <div className="glass-strong rounded-3xl p-6 shadow-soft">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-full bg-foreground/5 mb-6">
            {([
              { id: "signin", label: "Sign in" },
              { id: "signup", label: "Sign up" },
              { id: "otp", label: "Email code" },
            ] as { id: Mode; label: string }[]).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => { setMode(m.id); setOtpSent(false); }}
                className={`py-2 text-xs font-semibold rounded-full transition ${
                  mode === m.id ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <>
                <Field icon={UserIcon}>
                  <input
                    required
                    placeholder="Display name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </Field>
                <Field icon={AtSign}>
                  <input
                    placeholder="Username (optional, for search)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s+/g, "").toLowerCase())}
                    maxLength={30}
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </Field>
                <Field icon={Phone}>
                  <input
                    type="tel"
                    placeholder="+1 555 123 4567 (optional, for contact discovery)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </Field>
              </>
            )}

            {mode !== "otp" || !otpSent ? (
              <Field icon={Mail}>
                <input
                  required
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </Field>
            ) : null}

            {(mode === "signin" || mode === "signup") && (
              <Field icon={Lock}>
                <input
                  required
                  minLength={6}
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </Field>
            )}

            {mode === "otp" && otpSent && (
              <Field icon={KeyRound}>
                <input
                  required
                  inputMode="numeric"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none tracking-widest"
                />
              </Field>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-2xl bg-foreground text-background py-3 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" && "Sign in"}
              {mode === "signup" && "Create account"}
              {mode === "otp" && (otpSent ? "Verify code" : "Send email code")}
              {mode === "forgot" && "Send reset link"}
            </button>
          </form>

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Forgot your password?
            </button>
          )}
          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => setMode("signin")}
              className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
            >
              Back to sign in
            </button>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          By continuing you agree to Lumens'{" "}
          <Link to="/" className="underline">terms</Link>.
        </p>
      </div>
    </div>
  );
}

function Field({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-foreground/5 px-4 py-3">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {children}
    </div>
  );
}
