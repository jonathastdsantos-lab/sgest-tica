import { createFileRoute, Link } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { 
  CalendarDays, TrendingUp, Users, DollarSign, 
  ChevronRight, Sparkles, Clock, Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_auth/')({
  component: Dashboard,
});

function Dashboard() {
  const { tenant, currentUnit } = useTenant();
  
  const [appointmentsCount, setAppointmentsCount] = useState(0);
  const [leadsCount, setLeadsCount] = useState(0);
  const [todaysAgenda, setTodaysAgenda] = useState<any[]>([]);
  const [crmStats, setCrmStats] = useState({ open: 0, won: 0 });
  const [loading, setLoading] = useState(true);

  // Formatters
  const firstName = tenant?.name?.split(' ')[0] || 'Doutor(a)';
  const today = new Intl.DateTimeFormat('pt-BR', { 
    weekday: 'long', day: 'numeric', month: 'long' 
  }).format(new Date());

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!tenant) return;
      setLoading(true);

      try {
        const orgId = tenant.organization_id || tenant.id;
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Builder de query com base na unidade selecionada
        const buildQuery = (table: string) => {
          const q = supabase.from(table).select('*', { count: 'exact', head: true })
            .eq('organization_id', orgId);
          if (currentUnit) q.eq('unit_id', currentUnit.id);
          return q;
        };

        // Atendimentos Hoje
        const { count: aptCount } = await buildQuery('appointments')
          .gte('start_at', startOfDay.toISOString())
          .lte('start_at', endOfDay.toISOString());
        
        if (aptCount !== null) setAppointmentsCount(aptCount);

        // Novos Leads Hoje
        const { count: lCount } = await buildQuery('leads')
          .gte('created_at', startOfDay.toISOString());
        
        if (lCount !== null) setLeadsCount(lCount);

        // CRM Stats
        let leadsQuery = supabase.from('leads').select('status').eq('organization_id', orgId);
        if (currentUnit) leadsQuery = leadsQuery.eq('unit_id', currentUnit.id);
        
        const { data: leads } = await leadsQuery;
        
        if (leads) {
          const open = leads.filter(l => l.status === 'open').length;
          const won = leads.filter(l => l.status === 'won').length;
          setCrmStats({ open, won });
        }

        // Agenda de Hoje
        let agendaQuery = supabase
          .from('appointments')
          .select(`
            id, start_at, status,
            clients(full_name),
            procedures(name)
          `)
          .eq('organization_id', orgId)
          .gte('start_at', startOfDay.toISOString())
          .lte('start_at', endOfDay.toISOString())
          .order('start_at', { ascending: true })
          .limit(5);
          
        if (currentUnit) agendaQuery = agendaQuery.eq('unit_id', currentUnit.id);
        
        const { data: agenda } = await agendaQuery;
        if (agenda) setTodaysAgenda(agenda);
      } catch (err) {
        console.error('Erro ao carregar dados do dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [tenant, currentUnit]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Header (Greeting) */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-medium tracking-tight">
            Bom dia, {firstName} 👋
          </h1>
          <p className="mt-2 text-muted-foreground">
            Aqui está o resumo da sua clínica hoje {currentUnit ? `(${currentUnit.name})` : ''}.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-accent px-4 py-2 rounded-full w-fit">
          <CalendarDays className="size-4" />
          <span className="capitalize">{today}</span>
        </div>
      </div>

      {/* 2. KPIs Principais */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        <div className="panel p-5 space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Faturamento Mês</span>
            <DollarSign className="size-4" />
          </div>
          <div>
            <span className="text-2xl font-bold">R$ 0,00</span>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              Ainda não processado
            </div>
          </div>
        </div>

        <div className="panel p-5 space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Atendimentos Hoje</span>
            <CalendarDays className="size-4" />
          </div>
          <div>
            <span className="text-2xl font-bold">{appointmentsCount}</span>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              Agendados para hoje
            </div>
          </div>
        </div>

        <div className="panel p-5 space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Novos Leads</span>
            <Users className="size-4" />
          </div>
          <div>
            <span className="text-2xl font-bold">{leadsCount}</span>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              Novas oportunidades hoje
            </div>
          </div>
        </div>

        <div className="panel p-5 space-y-3">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Oportunidades Ativas</span>
            <TrendingUp className="size-4" />
          </div>
          <div>
            <span className="text-2xl font-bold">{crmStats.open}</span>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              Aguardando contato ou fechamento
            </div>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA (Agenda e Faturamento) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Agenda de Hoje */}
          <div className="panel flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="text-lg font-semibold tracking-tight">Agenda de hoje</h2>
              <Link to="/_auth/agenda" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
                Ver agenda completa <ChevronRight className="size-4" />
              </Link>
            </div>
            
            <div className="flex-1 flex flex-col">
              {loading ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">Carregando...</div>
              ) : todaysAgenda.length === 0 ? (
                <div className="flex-1 p-5 flex flex-col items-center justify-center text-center">
                  <div className="size-16 rounded-full bg-accent flex items-center justify-center mb-4 text-muted-foreground">
                    <Calendar className="size-8" />
                  </div>
                  <h3 className="text-base font-medium">Nenhum agendamento para hoje</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Aproveite o tempo livre para focar na gestão ou organizar sua clínica.
                  </p>
                  <Link to="/_auth/agenda" className="mt-6 px-4 py-2 bg-primary/10 text-primary font-medium rounded-md text-sm hover:bg-primary/20 transition-colors">
                    Novo Agendamento
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {todaysAgenda.map((apt) => (
                    <div key={apt.id} className="p-4 flex items-center justify-between hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-foreground font-medium w-16">
                          <Clock className="size-4 text-muted-foreground" />
                          {new Date(apt.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{apt.clients?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{apt.procedures?.name || 'Procedimento Padrão'}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {apt.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Faturamento */}
          <div className="panel flex flex-col h-[300px]">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="text-lg font-semibold tracking-tight">Faturamento</h2>
              <div className="flex bg-accent rounded-md p-1">
                <button className="px-3 py-1 text-xs font-medium bg-surface rounded shadow-sm text-foreground">7 dias</button>
                <button className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">30 dias</button>
                <button className="px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">Este mês</button>
              </div>
            </div>
            <div className="flex-1 p-5 flex items-center justify-center">
              {/* Chart Mock Empty State */}
              <div className="flex flex-col items-center text-muted-foreground">
                <TrendingUp className="size-8 mb-2 opacity-50" />
                <p className="text-sm">Gráfico disponível após as primeiras transações financeiras.</p>
              </div>
            </div>
          </div>

        </div>

        {/* COLUNA DIREITA (Insights e CRM) */}
        <div className="space-y-6">
          
          {/* Insights IA */}
          <div className="panel overflow-hidden relative border border-primary/20 bg-primary/5">
            <div className="absolute top-0 right-0 p-4">
              <Sparkles className="size-24 text-primary opacity-10" />
            </div>
            
            <div className="relative z-10 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="size-5 text-primary" />
                <h2 className="text-lg font-semibold tracking-tight text-primary">Insights da IA</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Analisamos sua clínica e encontramos oportunidades:
              </p>
              
              <div className="space-y-4">
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 size-2 rounded-full bg-primary shrink-0" />
                  <p className="text-sm text-foreground">
                    Existem <span className="font-semibold text-primary">3 horários vagos</span> amanhã à tarde. Deseja criar um agendamento rápido?
                  </p>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 size-2 rounded-full bg-primary shrink-0" />
                  <p className="text-sm text-foreground">
                    Você tem <span className="font-semibold">{crmStats.open} oportunidades de venda</span> abertas no seu funil comercial.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CRM Pipeline */}
          <div className="panel">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h2 className="text-lg font-semibold tracking-tight">Pipeline Comercial</h2>
              <Link to="/_auth/crm" className="text-sm text-primary font-medium hover:underline">
                Abrir CRM
              </Link>
            </div>
            <div className="p-5 space-y-4">
              
              <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="size-2 rounded-full bg-blue-500" />
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">Oportunidades em Aberto</span>
                </div>
                <span className="text-sm text-muted-foreground font-semibold">{crmStats.open}</span>
              </div>
              
              <div className="flex items-center justify-between group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="size-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium group-hover:text-primary transition-colors">Vendas Ganhas</span>
                </div>
                <span className="text-sm text-muted-foreground font-semibold">{crmStats.won}</span>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
