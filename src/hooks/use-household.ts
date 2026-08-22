import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Household = {
  id: string;
  name: string;
  invite_code: string;
};

/**
 * Garante que o usuário logado tenha uma conta compartilhada e retorna o id.
 */
export async function resolveHouseholdId(): Promise<string> {
  const { data: memberships, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id")
    .limit(1);
  if (membershipError) throw membershipError;

  let householdId = memberships?.[0]?.household_id ?? null;

  if (!householdId) {
    const { data: created, error: createError } = await supabase.rpc("create_household", {
      _name: "Nossa conta",
    });
    if (createError) throw createError;
    householdId = (created as string) ?? null;
  }

  if (!householdId) {
    throw new Error(
      "Não foi possível preparar sua conta compartilhada. Atualize a página e tente novamente."
    );
  }

  return householdId;
}

/**
 * Retorna a conta compartilhada (casal) do usuário logado.
 * Se ainda não existir, cria uma automaticamente via função segura no banco.
 */
export function useHousehold() {
  return useQuery({
    queryKey: ["household"],
    queryFn: async (): Promise<Household> => {
      const { data: memberships, error: membershipError } = await supabase
        .from("household_members")
        .select("household_id")
        .limit(1);
      if (membershipError) throw membershipError;

      let householdId = memberships?.[0]?.household_id ?? null;

      if (!householdId) {
        const { data: created, error: createError } = await supabase.rpc("create_household", {
          _name: "Nossa conta",
        });
        if (createError) throw createError;
        householdId = created as string;
      }

      const { data: household, error } = await supabase
        .from("households")
        .select("id, name, invite_code")
        .eq("id", householdId)
        .single();
      if (error) throw error;
      return household;
    },
    staleTime: 60_000,
  });
}

export function useMembersCount(householdId: string | undefined) {
  return useQuery({
    queryKey: ["members", householdId],
    enabled: Boolean(householdId),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("household_members")
        .select("user_id", { count: "exact", head: true })
        .eq("household_id", householdId!);
      if (error) throw error;
      return count ?? 1;
    },
  });
}
