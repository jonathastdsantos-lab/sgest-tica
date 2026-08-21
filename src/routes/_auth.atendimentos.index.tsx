import { createFileRoute, Link } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Stethoscope, Clock, CheckCircle, Play, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_auth/atendimentos/')({
  component: AtendimentosFila,
});

type Appointment = {
  id: string;
  start_at: string;
  status: string;
  client_id: string;
  clients?: { full_name: string; photo_url: string };
  procedures?: { name: string };
  professionals?: { name: string };
};

function AtendimentosFila() {
  const { tenant, currentUnit } = useTenant();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFila = async () => {
    if (!tenant) return;
    setLoading(true);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let query = supabase
      .from('appointments')
      .select(`
        id, start_at, status, client_id,
        clients(full_name, photo_url),
        procedures(name),
        professionals(name)
      `)
      .eq('organization_id', tenant.id)
      .gte('start_at', startOfDay.toISOString())
      .lte('start_at', endOfDay.toISOString())
      .order('start_at', { ascending: true });

    if (currentUnit) query = query.eq('unit_id', currentUnit.id);

    const { data } = await query;
    if (data) setAppointments(data as unknown as Appointment[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchFila();
  }, [tenant, currentUnit]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-foreground flex items-center gap-2">
            <Stethoscope className="size-6 text-primary" />
            Fila de Atendimento
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pacientes agendados para hoje {currentUnit ? `na unidade ${currentUnit.name}` : ''}.
          </p>
        </div>
      </div>

      {/* Lista */}
      <div className="panel overflow-hidden">
        {loading ? (
          <div className="p-10 flex justify-center text-muted-foreground">Carregando fila...</div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="size-14 rounded-full bg-accent flex items-center justify-center mb-3 text-muted-foreground">
              <CheckCircle className="size-7 text-success" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Nenhum paciente na fila</h3>
            <p className="text-sm text-muted-foreground mt-1">Todos os atendimentos de hoje já foram realizados ou não há consultas marcadas.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {appointments.map((apt) => (
              <div key={apt.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-accent/40 transition-colors">
                
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center bg-accent/50 border border-border rounded-xl p-2.5 min-w-[70px]">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Hoje</span>
                    <span className="text-base font-bold text-foreground leading-none mt-1">
                      {new Date(apt.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-full bg-accent flex items-center justify-center text-primary shrink-0 overflow-hidden font-semibold">
                      {apt.clients?.photo_url ? (
                        <img src={apt.clients.photo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="size-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{apt.clients?.full_name}</h4>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1"><Stethoscope className="size-3.5" /> {apt.procedures?.name || 'Consulta'}</span>
                        <span>•</span>
                        <span>{apt.professionals?.name || 'Sem profissional'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
                    apt.status === 'scheduled' ? "bg-accent text-accent-foreground" :
                    apt.status === 'in_progress' ? "bg-primary/10 text-primary" : "bg-success/10 text-success"
                  )}>
                    {apt.status === 'scheduled' ? 'Aguardando' : apt.status === 'in_progress' ? 'Em Atendimento' : 'Finalizado'}
                  </span>
                  
                  <Link
                    to="/atendimentos/$id"
                    params={{ id: apt.id }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <Play className="size-3.5" fill="currentColor" />
                    Iniciar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
