import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Duo Finanças" },
      {
        name: "description",
        content:
          "Acesse sua conta do Duo Finanças para acompanhar as finanças compartilhadas do casal.",
      },
      { property: "og:title", content: "Entrar — Duo Finanças" },
      {
        property: "og:description",
        content: "Login e cadastro do app de controle financeiro para casais.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Confira seu email para confirmar o cadastro.");
          setMode("login");
          return;
        }
        await supabase
          .from("profiles")
          .upsert({ id: data.session.user.id, display_name: name });
        navigate({ to: "/inicio" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/inicio" });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível continuar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <div className="w-full max-w-sm">
        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
          Duo Finanças
        </p>
        <h1 className="text-balance-tight mt-3 text-3xl font-semibold">
          {mode === "login" ? "Bem-vindo de volta" : "Criar sua conta"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cada pessoa tem o próprio acesso e os dois visualizam a mesma conta do casal.
        </p>

        <form onSubmit={handleSubmit} className="surface mt-8 space-y-4 p-5">
          {mode === "signup" ? (
            <div className="space-y-2">
              <Label htmlFor="name">Seu nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ana"
                required
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Cadastrar"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "login" ? "Não tenho conta. Cadastrar" : "Já tenho conta. Entrar"}
        </button>
      </div>
    </div>
  );
}
