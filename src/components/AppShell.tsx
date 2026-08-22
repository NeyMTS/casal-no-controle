import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({
  title,
  subtitle,
  action,
  topContent,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  topContent?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pb-28 pt-6">
        {topContent ? (
          <div className="mb-7">
            {topContent}
          </div>
        ) : null}

        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-balance-tight text-2xl font-semibold">
              {title}
            </h1>

            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>

          {action}
        </header>

        {children}
      </div>

      <BottomNav />
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="surface px-5 py-10 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
