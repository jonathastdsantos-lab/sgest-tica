import { createFileRoute } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { CalendarDays, Plus, Clock, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_auth/agenda')({
  component: Agenda,
});

type Appointment = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  clients: { full_name: string };
  procedures?: { name: string, color: string };
};

type Client = { id: string; full_name: string };

function Agenda() {
  const { tenant } = useTenant();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAgenda = async () => {
    if (!tenant) return;
    setLoading(true);
    
    // Start of day and End of day for currentDate
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id, start_at, end_at, status,
        clients(full_name),
        procedures(name, color)
      `)
      .eq('organization_id', tenant.organization_id)
      .gte('start_at', startOfDay.toISOString())
      .lte('start_at', endOfDay.toISOString())
      .order('start_at', { ascending: true });

    if (!error && data) {
      setAppointments(data as unknown as Appointment[]);
    }
    setLoading(false);
  };

  const fetchClientsForSelect = async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from('clients')
      .select('id, full_name')
      .eq('organization_id', tenant.organization_id)
      .order('full_name', { ascending: true });
    
    if (data) setClients(data);
  };

  useEffect(() => {
    fetchAgenda();
  }, [tenant, currentDate]);

  useEffect(() => {
    if (isModalOpen) {
      fetchClientsForSelect();
      setDateInput(currentDate.toISOString().split('T')[0]);
      setTimeInput('09:00');
    }
  }, [isModalOpen]);

  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !selectedClient) return;
    setSaving(true);
    
    const startAt = new Date(`${dateInput}T${timeInput}:00`);
    const endAt = new Date(startAt);
    endAt.setMinutes(startAt.getMinutes() + 60); // Default 1h duration

    const { error } = await supabase.from('appointments').insert({
      organization_id: tenant.organization_id,
      client_id: selectedClient,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'scheduled'
    });

    if (!error) {
      setIsModalOpen(false);
      setSelectedClient('');
      fetchAgenda();
    }
    setSaving(false);
  };

  const statusColors: Record<string, string> = {
    'scheduled': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    'confirmed': 'bg-green-500/10 text-green-600 border-green-500/20',
    'completed': 'bg-accent text-muted-foreground border-border',
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="size-6 text-primary" />
            Agenda Diária
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os atendimentos e horários da sua clínica.
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Novo Agendamento
        </button>
      </div>

      {/* Navegação de Datas */}
      <div className="flex items-center justify-between panel p-3">
        <button onClick={prevDay} className="p-2 hover:bg-accent rounded-md transition-colors">
          <ChevronLeft className="size-5" />
        </button>
        <div className="text-center">
          <span className="font-semibold text-lg capitalize">
            {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(currentDate)}
          </span>
          {currentDate.toDateString() === new Date().toDateString() && (
             <div className="text-xs font-medium text-primary uppercase tracking-wider mt-0.5">Hoje</div>
          )}
        </div>
        <button onClick={nextDay} className="p-2 hover:bg-accent rounded-md transition-colors">
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* Lista de Agenda */}
      <div className="panel overflow-hidden min-h-[400px]">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Carregando agenda...
          </div>
        ) : appointments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <div className="size-16 rounded-full bg-accent flex items-center justify-center mb-4 text-muted-foreground">
              <CalendarDays className="size-8" />
            </div>
            <h3 className="text-lg font-medium">Nenhum agendamento</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Não há atendimentos marcados para este dia.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {appointments.map((apt) => {
              const time = new Date(apt.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              return (
                <div key={apt.id} className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center hover:bg-accent/30 transition-colors">
                  
                  <div className="flex items-center gap-2 sm:w-24 shrink-0">
                    <Clock className="size-4 text-muted-foreground" />
                    <span className="font-display font-medium text-lg">{time}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base truncate">{apt.clients?.full_name}</h4>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>{apt.procedures?.name || 'Procedimento não informado'}</span>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <span className={cn(
                      "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
                      statusColors[apt.status] || statusColors['scheduled']
                    )}>
                      {apt.status === 'scheduled' ? 'Agendado' : apt.status === 'confirmed' ? 'Confirmado' : apt.status}
                    </span>
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-border animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-semibold tracking-tight mb-1">Novo Agendamento</h2>
            <p className="text-sm text-muted-foreground mb-6">Reserve um horário na agenda.</p>
            
            <form onSubmit={handleCreateAppointment} className="space-y-4">
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Cliente</label>
                <select
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="" disabled>Selecione um cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
                {clients.length === 0 && (
                  <p className="text-xs text-destructive mt-1">Nenhum cliente cadastrado. Cadastre um cliente primeiro.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data</label>
                  <input
                    type="date"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Horário</label>
                  <input
                    type="time"
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex h-10 flex-1 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedClient}
                  className="flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Agendando...' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
