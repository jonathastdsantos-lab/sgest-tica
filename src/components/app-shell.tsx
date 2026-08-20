import { Link, useNavigate } from "@tanstack/react-router";
import { 
  CalendarDays, ChevronsUpDown, LayoutGrid, Plus, Sparkles, Users, 
  Wallet, TrendingUp, Stethoscope, Megaphone, Package, UsersRound, 
  BarChart3, Settings, HelpCircle, Search, Bell, MoreHorizontal, LogOut, FileText, ChevronDown
} from "lucide-react";
import { useState, type ReactNode, useEffect, useRef } from "react";
import { useTenant } from "@/hooks/use-tenant";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

const navigation = [
  { to: "/_auth/", label: "Visão Geral", icon: LayoutGrid },
  { to: "/_auth/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/_auth/clientes", label: "Clientes", icon: Users },
  { to: "/_auth/crm", label: "CRM", icon: TrendingUp },
  { to: "/_auth/atendimentos", label: "Atendimentos", icon: Stethoscope },
  { to: "/_auth/financeiro", label: "Financeiro", icon: Wallet },
  { to: "/_auth/marketing", label: "Marketing", icon: Megaphone, badge: "Em breve" },
  { to: "/_auth/estoque", label: "Estoque", icon: Package, badge: "Em breve" },
  { to: "/_auth/equipe", label: "Equipe", icon: UsersRound, badge: "Em breve" },
  { to: "/_auth/relatorios", label: "Relatórios", icon: BarChart3, badge: "Em breve" },
] as const;

const bottomNavigation = [
  { to: "/_auth/assistente", label: "Assistente IA", icon: Sparkles, highlight: true },
  { to: "/_auth/configuracoes", label: "Configurações", icon: Settings },
  { to: "/_auth/ajuda", label: "Ajuda", icon: HelpCircle },
] as const;

const mobileNavigation = [
  { to: "/_auth/", label: "Home", icon: LayoutGrid },
  { to: "/_auth/agenda", label: "Agenda", icon: CalendarDays },
  { to: "/_auth/clientes", label: "Clientes", icon: Users },
  { to: "/_auth/crm", label: "CRM", icon: TrendingUp },
  { to: "#", label: "Mais", icon: MoreHorizontal, action: 'more' },
] as const;

export function AppShell({
  children,
}: {
  children: ReactNode;
}) {
  const { tenant, units, currentUnit, switchUnit } = useTenant();
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: '/login' });
  };

  const getInitials = (name?: string) => {
    if (!name) return "SG";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop Sidebar (Fixed) */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-3 p-6">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">SG</span>
          </div>
          <span className="font-semibold tracking-tight">SGEstética</span>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-6">
          <nav className="space-y-1">
            {navigation.map(({ to, label, icon: Icon, badge }) => (
              <Link
                key={to}
                to={to}
                disabled={!!badge}
                activeOptions={{ exact: to === "/_auth/" }}
                className={cn(
                  "group flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors",
                  badge ? "opacity-60 cursor-not-allowed hover:bg-transparent" : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                )}
                activeProps={{ className: "bg-accent font-medium text-foreground" }}
              >
                <div className="flex items-center gap-3">
                  <Icon className="size-4 shrink-0" strokeWidth={2} />
                  {label}
                </div>
                {badge && (
                  <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm">
                    {badge}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          <div className="h-px bg-border" />

          <nav className="space-y-1">
            {bottomNavigation.map(({ to, label, icon: Icon, highlight }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: true }}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  highlight ? "text-primary hover:bg-primary/5" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
                activeProps={{ className: highlight ? "bg-primary/10 font-medium" : "bg-accent font-medium text-foreground" }}
              >
                <Icon className={cn("size-4 shrink-0", highlight && "text-primary")} strokeWidth={2} />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col lg:pl-64 pb-16 lg:pb-0">
        
        {/* Top Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-surface/80 backdrop-blur-md px-4 sm:px-6 lg:px-8">
          
          {/* Left: Unit Selector */}
          <div className="flex items-center relative">
            <button
              onClick={() => setUnitMenuOpen(!unitMenuOpen)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium hover:bg-accent transition-colors"
            >
              <span className="truncate max-w-[120px] sm:max-w-[200px]">
                {tenant ? (currentUnit ? currentUnit.name : "Todas as unidades") : "Carregando..."}
              </span>
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </button>

            {unitMenuOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 rounded-md border border-border bg-popover p-1 shadow-lg z-50">
                <button
                  onClick={() => { switchUnit(null); setUnitMenuOpen(false); }}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                    currentUnit === null && "bg-accent font-medium"
                  )}
                >
                  Todas as unidades
                </button>
                {units.length > 0 && <div className="h-px bg-border my-1" />}
                {units.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { switchUnit(u.id); setUnitMenuOpen(false); }}
                    className={cn(
                      "flex w-full flex-col items-start rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                      u.id === currentUnit?.id && "bg-accent"
                    )}
                  >
                    <span className="font-medium">{u.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Center: Global Search */}
          <div className="hidden flex-1 max-w-md mx-4 md:flex items-center">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar cliente, telefone, procedimento... (Ctrl+K)" 
                className="h-9 w-full rounded-full border border-input bg-background/50 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-all"
              />
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-4 relative">
            {/* Quick Action Button */}
            <div className="relative">
              <button
                onClick={() => setNewMenuOpen(!newMenuOpen)}
                className="flex h-9 items-center gap-2 rounded-full bg-primary pl-2.5 pr-3.5 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                <div className="flex size-5 items-center justify-center rounded-full bg-primary-foreground/20">
                  <Plus className="size-3.5" />
                </div>
                <span className="hidden sm:inline">Novo</span>
              </button>
              
              {newMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-md border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
                  <button onClick={() => setNewMenuOpen(false)} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"><CalendarDays className="size-4 text-muted-foreground"/> Novo agendamento</button>
                  <button onClick={() => setNewMenuOpen(false)} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"><Users className="size-4 text-muted-foreground"/> Novo cliente</button>
                  <button onClick={() => setNewMenuOpen(false)} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"><TrendingUp className="size-4 text-muted-foreground"/> Novo lead</button>
                  <div className="h-px bg-border my-1" />
                  <button disabled className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm opacity-50 cursor-not-allowed"><Wallet className="size-4 text-muted-foreground"/> Nova despesa</button>
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => {}} className="flex size-9 items-center justify-center rounded-full hover:bg-accent transition-colors relative group">
                <Bell className="size-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <span className="absolute top-2 right-2.5 size-2 rounded-full bg-destructive border-2 border-surface" />
              </button>
            </div>

            {/* Avatar / Account */}
            <div className="relative ml-1">
              <button 
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="flex size-9 items-center justify-center rounded-full bg-accent ring-1 ring-border transition-transform hover:scale-105"
              >
                <span className="text-xs font-semibold text-foreground">
                  {getInitials(tenant?.responsavel)}
                </span>
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-md border border-border bg-popover p-1 shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-2 py-2 border-b border-border mb-1">
                    <p className="text-sm font-medium">{tenant?.responsavel}</p>
                    <p className="text-xs text-muted-foreground">{tenant?.nome}</p>
                  </div>
                  <button onClick={() => setAccountMenuOpen(false)} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"><Settings className="size-4 text-muted-foreground"/> Minha Conta</button>
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 mt-1"><LogOut className="size-4"/> Sair</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-surface/90 backdrop-blur-md pb-safe lg:hidden">
        {mobileNavigation.map(({ to, label, icon: Icon, action }) => (
          <Link
            key={label}
            to={to === '#' ? window.location.pathname : to}
            activeOptions={{ exact: to === "/_auth/" }}
            className={cn(
              "flex flex-col items-center justify-center gap-1 w-full h-full",
              action === 'more' ? "text-muted-foreground" : "text-muted-foreground hover:text-foreground"
            )}
            activeProps={{ className: "text-foreground font-medium" }}
            onClick={(e) => {
              if (action === 'more') {
                e.preventDefault();
                // Opcional: Abrir um menu drawer
              }
            }}
          >
            <Icon className="size-5" />
            <span className="text-[10px]">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
