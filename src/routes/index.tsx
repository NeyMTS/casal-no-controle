import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();

    if (!error && data.user) {
      throw redirect({ to: "/inicio" });
    }

    throw redirect({ to: "/auth" });
  },
  component: Index,
});

function Index() {
  return null;
}
