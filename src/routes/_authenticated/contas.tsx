import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, EmptyState } from "@/components/AppShell";
import { resolveHouseholdId, useHousehold, useMembersCount } from "@/hooks/use-household";
import { currencyInputValue, formatCurrency, parseCurrencyInput } from "@/lib/format";
import { CurrencyInput } from "@/components/CurrencyInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const KINDS = ["conta", "carteira", "poupança", "cartão"];

const emptyForm = { name: "", kind: "conta", initial_balance: "" };

export const Route = createFileRoute("/_authenticated/contas")({
  head: () => ({
    meta: [
      { title: "Contas — Duo Finanças" },
      {
        name: "description",
        content:
          "Cadastre as contas, carteiras e cartões usados pelo casal e convide a outra pessoa.",
      },
      { property: "og:title", content: "Contas — Duo Finanças" },
      { property: "og:description", content: "Contas financeiras compartilhadas do casal." },
    ],
  }),
  component: ContasPage,
});

function ContasPage() {
  const queryClient = useQueryClient();
  const { data: household } = useHousehold();
  const { data: membersCount } = useMembersCount(household?.id);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [form, setForm] = useState(emptyForm);

  const { data: accounts } = useQuery({
    queryKey: ["accounts", household?.id],
    enabled: Boolean(household?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts")
        .select("id, name, kind, initial_balance")
        .eq("household_id", household!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const saveAccount = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        kind: form.kind,
        initial_balance: parseCurrencyInput(form.initial_balance),
      };

      if (!payload.name) {
        throw new Error("Informe o nome da conta.");
      }

      if (editingId) {
        const { error } = await supabase
          .from("accounts")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        return;
      }

      const householdId = await resolveHouseholdId();
      const { error } = await supabase.from("accounts").insert({
        household_id: householdId,
        ...payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(editingId ? "Conta atualizada." : "Conta criada.");
      setOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteAccount = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta excluída.");
      setDeletingId(null);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const joinHousehold = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("join_household", { _invite_code: inviteCode });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Você entrou na conta compartilhada.");
      setInviteCode("");
      queryClient.invalidateQueries();
    },
    onError: () => toast.error("Código de convite inválido."),
  });

  const rows = accounts ?? [];

  return (
    <AppShell
      title="Contas"
      subtitle="Onde o dinheiro do casal fica"
      action={
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setEditingId(null);
              setForm(emptyForm);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              size="icon"
              className="rounded-full"
              aria-label="Nova conta"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
            >
              <Plus className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar conta" : "Nova conta"}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveAccount.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="account-name">Nome</Label>
                <Input
                  id="account-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.kind} onValueChange={(kind) => setForm({ ...form, kind })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="balance">Saldo inicial</Label>
                <CurrencyInput
                  id="balance"
                  value={form.initial_balance}
                  onValueChange={(initial_balance) =>
                    setForm({ ...form, initial_balance })
                  }
                />
              </div>
              <Button type="submit" className="w-full" disabled={saveAccount.isPending}>
                {saveAccount.isPending
                  ? "Salvando..."
                  : editingId
                    ? "Salvar alterações"
                    : "Salvar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <section className="surface p-5">
        <div className="flex items-center gap-2 text-slateblue">
          <Users className="size-4" strokeWidth={1.8} />
          <span className="text-xs font-medium">Conta compartilhada</span>
        </div>
        <p className="mt-2 text-sm font-medium">{household?.name ?? "—"}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {membersCount ?? 1} pessoa(s) · código de convite{" "}
          <span className="font-semibold text-foreground">{household?.invite_code ?? "—"}</span>
        </p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            joinHousehold.mutate();
          }}
        >
          <Input
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
            placeholder="Entrar com código"
            aria-label="Código de convite"
          />
          <Button type="submit" variant="secondary" disabled={joinHousehold.isPending}>
            Entrar
          </Button>
        </form>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold">Suas contas</h2>
        {rows.length === 0 ? (
          <EmptyState text="Nenhuma conta cadastrada ainda." />
        ) : (
          <ul className="space-y-2">
            {rows.map((a) => (
              <li key={a.id} className="surface flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">{a.kind}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold">
                    {formatCurrency(Number(a.initial_balance))}
                  </span>
                  <button
                    type="button"
                    aria-label="Editar conta"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => {
                      setEditingId(a.id);
                      setForm({
                        name: a.name,
                        kind: a.kind,
                        initial_balance: currencyInputValue(a.initial_balance),
                      });
                      setOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" strokeWidth={1.8} />
                  </button>
                  <button
                    type="button"
                    aria-label="Excluir conta"
                    className="rounded-full p-1.5 text-muted-foreground transition-colors hover:text-expense"
                    onClick={() => setDeletingId(a.id)}
                  >
                    <Trash2 className="size-3.5" strokeWidth={1.8} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AlertDialog
        open={Boolean(deletingId)}
        onOpenChange={(next) => !next && setDeletingId(null)}
      >
        <AlertDialogContent className="max-w-xs rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                if (deletingId) deleteAccount.mutate(deletingId);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
