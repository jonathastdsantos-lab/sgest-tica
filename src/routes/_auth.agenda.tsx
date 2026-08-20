import { createFileRoute } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, User } from 'lucide-react';
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
  const { tenant, currentUnit } = useTenant();
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
    
    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    let query = supabase
      .from('appointments')
      .select(`
        id, start_at, end_at, status,
        clients(full_name),
        procedures(name, color)
      `)
      .eq('organization_id', tenant.id)
      .gte('start_at', startOfDay.toISOString())
      .lte('start_at', endOfDay.toISOString())
      .order('start_at', { ascending: true });

    if (currentUnit) {
      query = query.eq('unit_id', currentUnit.id);
    }

    const { data, error } = await query;

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
      .eq('organization_id', tenant.id)
      .order('full_name', { ascending: true });
    
    if (data) setClients(data);
  };

  useEffect(() => {
    fetchAgenda();
  }, [tenant, currentUnit, currentDate]);

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
      organization_id: tenant.id,
      unit_id: currentUnit ? currentUnit.id : null,
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

  const isToday = currentDate.toDateString() === new Date().toDateString();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="size-6 text-primary" />
            Agenda {currentUnit ? `(${currentUnit.name})` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os horários e atendimentos da clínica.
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

      <div className="panel flex flex-col flex-1 overflow-hidden">
        
        {/* Date Navigation */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-accent rounded-md p-1 shadow-sm">
              <button onClick={prevDay} className="p-1.5 hover:bg-surface rounded text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="size-4" />
              </button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded transition-colors",
                  isToday ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Hoje
              </button>
              <button onClick={nextDay} className="p-1.5 hover:bg-surface rounded text-muted-foreground hover:text-foreground transition-colors">
                <ChevronRight className="size-4" />
              </button>
            </div>
            
            <h2 className="text-lg font-semibold tracking-tight capitalize">
              {new Intl.DateTimeFormat('pt-BR', { 
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
              }).format(currentDate)}
            </h2>
          </div>
          
          <div className="flex bg-accent rounded-md p-1">
            <button className="px-3 py-1.5 text-xs font-medium bg-surface rounded shadow-sm text-foreground">Dia</button>
            <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">Semana</button>
          </div>
        </div>

        {/* Timeline View */}
        <div className="flex-1 overflow-y-auto bg-surface relative">
          
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
              <span className="text-muted-foreground font-medium animate-pulse">Carregando horários...</span>
            </div>
          ) : appointments.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
              <div className="size-16 rounded-full bg-accent flex items-center justify-center mb-4 text-muted-foreground">
                <CalendarDays className="size-8" />
              </div>
              <h3 className="text-base font-medium">Nenhum agendamento</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Não há consultas ou procedimentos agendados para este dia nesta unidade.
              </p>
              <button onClick={() => setIsModalOpen(true)} className="mt-6 px-4 py-2 bg-primary/10 text-primary font-medium rounded-md text-sm hover:bg-primary/20 transition-colors">
                Criar Primeiro Agendamento
              </button>
            </div>
          ) : (
            <div className="min-w-[600px]">
              {/* Fake timeline grid */}
              <div className="divide-y divide-border">
                {appointments.map((apt) => (
                  <div key={apt.id} className="group flex border-l-4 border-transparent hover:border-primary hover:bg-accent/30 transition-all p-4">
                    {/* Time Column */}
                    <div className="w-24 shrink-0 border-r border-border pr-4 text-right">
                      <div className="text-sm font-bold text-foreground">
                        {new Date(apt.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        até {new Date(apt.end_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    {/* Content Column */}
                    <div className="pl-6 flex-1 flex flex-col justify-center">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="size-4 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{apt.clients?.full_name}</span>
                        <span className={cn(
                          "ml-2 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider",
                          apt.status === 'scheduled' ? "bg-blue-500/10 text-blue-500" : 
                          apt.status === 'confirmed' ? "bg-success/10 text-success" : 
                          "bg-muted text-muted-foreground"
                        )}>
                          {apt.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-primary" />
                          {apt.procedures?.name || 'Procedimento Padrão'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal Novo Agendamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-border animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-semibold tracking-tight mb-1">Novo Agendamento</h2>
            <p className="text-sm text-muted-foreground mb-6">Reserve um horário na agenda da clínica.</p>
            
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
                  <label className="text-sm font-medium">Horário (Início)</label>
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
                  disabled={saving}
                  className="flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
