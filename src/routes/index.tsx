import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Financeiro Studio — Controle financeiro" },
      {
        name: "description",
        content:
          "Acesse o Financeiro Studio para acompanhar contas, movimentações e metas compartilhadas do casal.",
      },
      { property: "og:title", content: "Financeiro Studio — Entrar" },
      {
        property: "og:description",
        content: "Controle financeiro compartilhado para casais.",
      },
    ],
  }),
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      navigate({ to: !error && data.user ? "/inicio" : "/auth", replace: true });
    });

    return () => {
      active = false;
    };
  }, [navigate]);

  return <div className="min-h-screen bg-background" />;
}
