import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronsUpDown, LayoutGrid, Plus, Sparkles, Users, Wallet } from "lucide-react";
import { useState, type ReactNode } from "react";

import avatar from "@/assets/dra-beatriz.jpg";
import { useTenant } from "@/lib/tenant";
import { cn } from "@/lib/utils";

const navegacao = [
  { to: "/", label: "Painel Principal", icon: LayoutGrid },
  { to: "/agenda", label: "Agenda Semanal", icon: CalendarDays },
  { to: "/pacientes", label: "Pacientes", icon: Users },
  { to: "/financeiro", label: "Financeiro", icon: Wallet },
] as const;

export function AppShell({
  titulo,
  acao,
  children,
}: {
  titulo: string;
  acao?: string;
  children: ReactNode;
}) {
  const { tenant, tenants, setTenantId } = useTenant();
  const [aberto, setAberto] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="flex items-center gap-3 p-6">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-medium text-primary-foreground">SG</span>
          </div>
          <span className="font-medium tracking-tight">SG Estética</span>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          {navegacao.map(({ to, label, icon: Icone }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent"
              activeProps={{ className: "bg-sidebar-accent font-medium text-sidebar-foreground" }}
            >
              <Icone className="size-4 shrink-0" strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="relative mt-auto border-t border-sidebar-border p-4">
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-sidebar-accent"
          >
            <img
              src={avatar}
              alt={tenant.responsavel}
              loading="lazy"
              width={512}
              height={512}
              className="size-8 rounded-full object-cover ring-1 ring-border"
            />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-medium">{tenant.unidade}</span>
              <span className="truncate text-[10px] text-muted-foreground">{tenant.responsavel}</span>
            </span>
            <ChevronsUpDown className="ml-auto size-3.5 text-muted-foreground" />
          </button>

          {aberto ? (
            <div className="absolute bottom-20 left-4 right-4 overflow-hidden rounded-md bg-surface shadow-lg ring-1 ring-border">
              {tenants.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTenantId(t.id);
                    setAberto(false);
                  }}
                  className={cn(
                    "flex w-full flex-col px-3 py-2 text-left transition-colors hover:bg-sidebar-accent",
                    t.id === tenant.id && "bg-sidebar-accent",
                  )}
                >
                  <span className="text-xs font-medium">{t.unidade}</span>
                  <span className="text-[10px] text-muted-foreground">{t.cidade}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </aside>

      <div className="lg:ml-64">
        <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-6 md:px-8">
          <h1 className="text-balance font-display text-xl tracking-tight">{titulo}</h1>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm ring-1 ring-border transition-colors hover:bg-accent">
              <Plus className="size-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">{acao ?? "Nova Consulta"}</span>
            </button>
            <button
              aria-label="Assistente inteligente"
              className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Sparkles className="size-4" strokeWidth={1.75} />
            </button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-4 py-2 lg:hidden">
          {navegacao.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-muted-foreground"
              activeProps={{ className: "bg-sidebar-accent font-medium text-foreground" }}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="mx-auto max-w-7xl px-6 py-10 md:px-8">{children}</div>
      </div>
    </div>
  );
}
