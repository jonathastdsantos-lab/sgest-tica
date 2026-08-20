import { createFileRoute } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { useEffect, useState, useMemo } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, User, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const Route = createFileRoute('/_auth/agenda')({
  component: Agenda,
});

type Professional = { id: string; name: string };
type Client = { id: string; full_name: string };
type Procedure = { id: string; name: string; duration_minutes: number; color: string };

type Appointment = {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  client_id: string;
  professional_id: string | null;
  procedure_id: string | null;
  clients?: { full_name: string };
  procedures?: { name: string; color: string; duration_minutes: number };
  professionals?: { id: string; name: string };
};

const START_HOUR = 8;
const END_HOUR = 20;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 60; // 60px por slot de 30 mins

function Agenda() {
  const { tenant, currentUnit } = useTenant();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedProf, setSelectedProf] = useState('');
  const [selectedProc, setSelectedProc] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('');
  const [saving, setSaving] = useState(false);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      slots.push(`${h.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const fetchData = async () => {
    if (!tenant) return;
    setLoading(true);
    
    // Profissionais
    const { data: profData } = await supabase
      .from('professionals')
      .select('id, name')
      .eq('organization_id', tenant.id)
      .eq('status', 'active');
    
    if (profData) setProfessionals(profData);

    const startOfDay = new Date(currentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(currentDate);
    endOfDay.setHours(23, 59, 59, 999);

    let query = supabase
      .from('appointments')
      .select(`
        id, start_at, end_at, status, client_id, professional_id, procedure_id,
        clients(full_name),
        procedures(name, color, duration_minutes),
        professionals(id, name)
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

  const fetchDependencies = async () => {
    if (!tenant) return;
    const { data: cData } = await supabase.from('clients').select('id, full_name').eq('organization_id', tenant.id).order('full_name');
    if (cData) setClients(cData);

    const { data: pData } = await supabase.from('procedures').select('id, name, duration_minutes, color').eq('organization_id', tenant.id).eq('active', true).order('name');
    if (pData) setProcedures(pData);
  };

  useEffect(() => {
    fetchData();
  }, [tenant, currentUnit, currentDate]);

  useEffect(() => {
    if (isModalOpen) {
      fetchDependencies();
      setDateInput(currentDate.toISOString().split('T')[0]);
      setTimeInput('09:00');
    }
  }, [isModalOpen]);

  const prevDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() - 1); setCurrentDate(d); };
  const nextDay = () => { const d = new Date(currentDate); d.setDate(d.getDate() + 1); setCurrentDate(d); };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !selectedClient) return;
    setSaving(true);
    
    const startAt = new Date(`${dateInput}T${timeInput}:00`);
    const proc = procedures.find(p => p.id === selectedProc);
    const duration = proc ? proc.duration_minutes : 60;
    
    const endAt = new Date(startAt);
    endAt.setMinutes(startAt.getMinutes() + duration);

    // Conflito check no criar
    const hasConflict = appointments.some(a => {
      if (selectedProf && a.professional_id !== selectedProf) return false;
      if (!selectedProf && a.professional_id) return false;
      const aStart = new Date(a.start_at).getTime();
      const aEnd = new Date(a.end_at).getTime();
      return (startAt.getTime() < aEnd && endAt.getTime() > aStart);
    });

    if (hasConflict) {
      toast.error('Profissional já possui agendamento neste horário.');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('appointments').insert({
      organization_id: tenant.id,
      unit_id: currentUnit ? currentUnit.id : null,
      client_id: selectedClient,
      professional_id: selectedProf || null,
      procedure_id: selectedProc || null,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      status: 'scheduled'
    });

    if (!error) {
      toast.success('Agendamento criado com sucesso.');
      setIsModalOpen(false);
      setSelectedClient('');
      setSelectedProf('');
      setSelectedProc('');
      fetchData();
    } else {
      toast.error('Falha ao criar agendamento.');
    }
    setSaving(false);
  };

  // Drag and Drop Grid
  const handleDragStart = (e: React.DragEvent, aptId: string) => {
    e.dataTransfer.setData('aptId', aptId);
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // allow drop
  };

  const handleDrop = async (e: React.DragEvent, profId: string | null, timeStr: string) => {
    e.preventDefault();
    const aptId = e.dataTransfer.getData('aptId');
    if (!aptId) return;

    const apt = appointments.find(a => a.id === aptId);
    if (!apt) return;

    const newStartAt = new Date(currentDate);
    const [hours, minutes] = timeStr.split(':').map(Number);
    newStartAt.setHours(hours, minutes, 0, 0);

    const durationMs = new Date(apt.end_at).getTime() - new Date(apt.start_at).getTime();
    const newEndAt = new Date(newStartAt.getTime() + durationMs);

    // Conflict Check
    const hasConflict = appointments.some(a => {
      if (a.id === aptId) return false;
      if (profId && a.professional_id !== profId) return false;
      if (!profId && a.professional_id) return false;
      const aStart = new Date(a.start_at).getTime();
      const aEnd = new Date(a.end_at).getTime();
      return (newStartAt.getTime() < aEnd && newEndAt.getTime() > aStart);
    });

    if (hasConflict) {
      toast.error('Horário conflitante para este profissional.');
      return;
    }

    // Optimistic Update
    const prof = professionals.find(p => p.id === profId);
    setAppointments(prev => prev.map(a => 
      a.id === aptId 
        ? { ...a, start_at: newStartAt.toISOString(), end_at: newEndAt.toISOString(), professional_id: profId, professionals: prof as any } 
        : a
    ));

    const { error } = await supabase.from('appointments').update({
      professional_id: profId,
      start_at: newStartAt.toISOString(),
      end_at: newEndAt.toISOString()
    }).eq('id', aptId);

    if (error) {
      toast.error('Erro ao mover agendamento.');
      fetchData(); // revert
    } else {
      toast.success('Horário atualizado!');
    }
  };

  const isToday = currentDate.toDateString() === new Date().toDateString();
  const columns = [...professionals, { id: 'unassigned', name: 'Sem Profissional' }];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-foreground flex items-center gap-2">
            <CalendarDays className="size-6 text-primary" />
            Agenda {currentUnit ? `(${currentUnit.name})` : ''}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie e remaneje os horários da sua equipe.
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

      <div className="panel flex flex-col flex-1 overflow-hidden relative">
        
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-accent rounded-md p-1 shadow-sm">
              <button onClick={prevDay} className="p-1.5 hover:bg-surface rounded text-muted-foreground hover:text-foreground transition-colors"><ChevronLeft className="size-4" /></button>
              <button 
                onClick={() => setCurrentDate(new Date())}
                className={cn("px-3 py-1 text-xs font-medium rounded transition-colors", isToday ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >Hoje</button>
              <button onClick={nextDay} className="p-1.5 hover:bg-surface rounded text-muted-foreground hover:text-foreground transition-colors"><ChevronRight className="size-4" /></button>
            </div>
            
            <h2 className="text-lg font-semibold tracking-tight capitalize">
              {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(currentDate)}
            </h2>
          </div>
        </div>

        {/* Calendar Desktop Grid (Hidden on Mobile) */}
        <div className="hidden md:flex flex-1 overflow-auto bg-surface relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
              <span className="text-muted-foreground font-medium animate-pulse">Carregando horários...</span>
            </div>
          ) : (
            <div className="min-w-max flex flex-col h-max">
              {/* Grid Header (Columns) */}
              <div className="flex sticky top-0 z-30 bg-surface border-b border-border shadow-sm">
                <div className="w-16 shrink-0 border-r border-border bg-surface" /> {/* Time column header */}
                {columns.map(col => (
                  <div key={col.id} className="w-64 shrink-0 px-4 py-3 font-semibold text-sm border-r border-border text-center">
                    {col.name}
                  </div>
                ))}
              </div>

              {/* Grid Body */}
              <div className="flex flex-1 relative">
                {/* Time Axis */}
                <div className="w-16 shrink-0 border-r border-border bg-accent/30 relative">
                  {timeSlots.map((time, i) => (
                    <div key={time} className="absolute w-full flex items-start justify-center text-[10px] font-medium text-muted-foreground -mt-2" style={{ top: i * SLOT_HEIGHT }}>
                      {time.endsWith('00') ? time : ''}
                    </div>
                  ))}
                </div>

                {/* Professional Columns */}
                {columns.map(col => {
                  const profApts = appointments.filter(a => col.id === 'unassigned' ? !a.professional_id : a.professional_id === col.id);
                  
                  return (
                    <div key={col.id} className="w-64 shrink-0 border-r border-border relative bg-surface group/col">
                      {/* Drop Slots (Background Grid) */}
                      {timeSlots.map((time, i) => (
                        <div 
                          key={time} 
                          className="absolute w-full border-b border-border/50 hover:bg-accent/50 transition-colors cursor-crosshair z-0" 
                          style={{ top: i * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, col.id === 'unassigned' ? null : col.id, time)}
                          onClick={() => {
                            setSelectedProf(col.id === 'unassigned' ? '' : col.id);
                            setTimeInput(time);
                            setIsModalOpen(true);
                          }}
                        />
                      ))}

                      {/* Appointments (Absolute Placed) */}
                      {profApts.map(apt => {
                        const start = new Date(apt.start_at);
                        const end = new Date(apt.end_at);
                        
                        // Calculate offset Top
                        const hoursFromStart = start.getHours() - START_HOUR;
                        const minsFromStart = start.getMinutes();
                        const topPx = (hoursFromStart * 2 * SLOT_HEIGHT) + (minsFromStart / 30 * SLOT_HEIGHT);
                        
                        // Calculate Height
                        const durationMins = (end.getTime() - start.getTime()) / 60000;
                        const heightPx = (durationMins / 30) * SLOT_HEIGHT;

                        return (
                          <div 
                            key={apt.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, apt.id)}
                            onDragEnd={handleDragEnd}
                            className="absolute left-1 right-1 z-10 p-2 rounded-md shadow-sm border border-primary/20 bg-primary/10 overflow-hidden cursor-move hover:ring-1 hover:ring-primary transition-all flex flex-col group"
                            style={{ top: topPx, height: heightPx - 2 }}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold text-primary">{start.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
                              <GripVertical className="size-3 text-primary/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <span className="text-xs font-semibold text-foreground truncate">{apt.clients?.full_name}</span>
                            <span className="text-[10px] text-muted-foreground truncate">{apt.procedures?.name || 'Consulta'}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Mobile View (List/Timeline) */}
        <div className="flex-1 md:hidden overflow-y-auto bg-surface relative p-4">
          {loading ? (
             <div className="flex items-center justify-center text-muted-foreground mt-10">Carregando...</div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-6 mt-10">
              <div className="size-16 rounded-full bg-accent flex items-center justify-center mb-4 text-muted-foreground"><Calendar className="size-8" /></div>
              <h3 className="text-base font-medium">Nenhum agendamento</h3>
              <p className="text-sm text-muted-foreground mt-1">Sua agenda está livre.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
               {appointments.map((apt) => (
                  <div key={apt.id} className="py-4 flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col text-right">
                        <span className="text-sm font-bold text-foreground">{new Date(apt.start_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-xs text-muted-foreground">até {new Date(apt.end_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="w-1 bg-primary/50 rounded-full shrink-0" style={{ height: '100%' }} />
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm text-foreground">{apt.clients?.full_name}</h4>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1"><User className="size-3"/> {apt.professionals?.name || 'Sem profissional'}</span>
                          <span>•</span>
                          <span>{apt.procedures?.name || 'Padrão'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
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
                <label className="text-sm font-medium">Cliente <span className="text-destructive">*</span></label>
                <select required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary" value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>
                  <option value="" disabled>Selecione um cliente...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Procedimento</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary" value={selectedProc} onChange={(e) => setSelectedProc(e.target.value)}>
                  <option value="">Selecione um procedimento...</option>
                  {procedures.map(p => <option key={p.id} value={p.id}>{p.name} ({p.duration_minutes} min)</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Profissional</label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary" value={selectedProf} onChange={(e) => setSelectedProf(e.target.value)}>
                  <option value="">Sem profissional específico...</option>
                  {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data <span className="text-destructive">*</span></label>
                  <input type="date" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary" value={dateInput} onChange={(e) => setDateInput(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Horário <span className="text-destructive">*</span></label>
                  <input type="time" required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm focus:ring-1 focus:ring-primary" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex h-10 flex-1 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent">Cancelar</button>
                <button type="submit" disabled={saving} className="flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
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
