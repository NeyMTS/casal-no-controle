import { Link } from "@tanstack/react-router";
import { Home, ArrowLeftRight, Wallet, Target } from "lucide-react";

const items = [
  { to: "/inicio", label: "Início", icon: Home },
  { to: "/movimentacoes", label: "Movimentações", icon: ArrowLeftRight },
  { to: "/contas", label: "Contas", icon: Wallet },
  { to: "/metas", label: "Metas", icon: Target },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              className="flex flex-col items-center gap-1 py-3 text-[10px] font-medium tracking-wide text-muted-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              <Icon className="size-5" strokeWidth={1.6} />
              <span>{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
