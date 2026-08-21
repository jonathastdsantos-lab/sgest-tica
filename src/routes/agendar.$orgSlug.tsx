import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  Calendar, Clock, User, CheckCircle2, Sparkles, 
  MapPin, Phone, ArrowLeft, ChevronRight, ShieldCheck 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const Route = createFileRoute('/agendar/$orgSlug')({
  component: AgendamentoPublico,
});

type Organization = {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
};

type Procedure = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
};

type Professional = {
  id: string;
  name: string;
  role: string;
};

function AgendamentoPublico() {
  const { orgSlug } = Route.useParams();

  const [org, setOrg] = useState<Organization | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Flow Step: 1 = Procedure, 2 = Professional & Slot, 3 = Client Info, 4 = Success
  const [step, setStep] = useState(1);

  // Selected State
  const [selectedProc, setSelectedProc] = useState<Procedure | null>(null);
  const [selectedProf, setSelectedProf] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [busySlots, setBusySlots] = useState<string[]>([]);

  // Client Form State
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completedApt, setCompletedApt] = useState<any | null>(null);

  // Fetch Org details
  useEffect(() => {
    const fetchOrgData = async () => {
      setLoading(true);
      setNotFound(false);

      // Fetch org by slug or fallback by name
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .or(`slug.eq.${orgSlug},name.ilike.%${orgSlug}%`)
        .single();

      if (!orgData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setOrg(orgData);

      // Fetch active procedures
      const { data: procData } = await supabase
        .from('procedures')
        .select('id, name, price, duration_minutes')
        .eq('organization_id', orgData.id)
        .order('name', { ascending: true });

      if (procData) setProcedures(procData);

      // Fetch active professionals
      const { data: profData } = await supabase
        .from('professionals')
        .select('id, name, role')
        .eq('organization_id', orgData.id)
        .order('name', { ascending: true });

      if (profData) setProfessionals(profData);

      setLoading(false);
    };

    fetchOrgData();
  }, [orgSlug]);

  // Fetch busy slots when date or professional changes
  useEffect(() => {
    const fetchBusySlots = async () => {
      if (!org || !selectedDate) return;

      const dayStart = new Date(`${selectedDate}T00:00:00`).toISOString();
      const dayEnd = new Date(`${selectedDate}T23:59:59`).toISOString();

      let query = supabase
        .from('appointments')
        .select('start_at, end_at')
        .eq('organization_id', org.id)
        .gte('start_at', dayStart)
        .lte('start_at', dayEnd)
        .neq('status', 'cancelled');

      if (selectedProf) {
        query = query.eq('professional_id', selectedProf.id);
      }

      const { data: apts } = await query;

      if (apts) {
        const busy = apts.map(a => {
          const d = new Date(a.start_at);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        });
        setBusySlots(busy);
      }
    };

    fetchBusySlots();
  }, [org, selectedDate, selectedProf]);

  // Generate available time slots (08:00 - 19:00)
  const generateSlots = () => {
    const slots = [];
    for (let h = 8; h <= 18; h++) {
      const timeString1 = `${String(h).padStart(2, '0')}:00`;
      const timeString2 = `${String(h).padStart(2, '0')}:30`;
      slots.push(timeString1, timeString2);
    }
    return slots;
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org || !selectedProc || !selectedTime) return;
    setSubmitting(true);

    try {
      // 1. Find or create client
      let clientId = null;

      const { data: existingClients } = await supabase
        .from('clients')
        .select('id')
        .eq('organization_id', org.id)
        .or(`phone.eq.${clientPhone},whatsapp.eq.${clientPhone}`)
        .limit(1);

      if (existingClients && existingClients.length > 0) {
        clientId = existingClients[0].id;
      } else {
        const { data: newClient, error: clientErr } = await supabase
          .from('clients')
          .insert({
            organization_id: org.id,
            full_name: clientName,
            phone: clientPhone,
            whatsapp: clientPhone,
            status: 'active',
          })
          .select('id')
          .single();

        if (newClient) clientId = newClient.id;
      }

      if (!clientId) {
        toast.error('Erro ao registrar dados do cliente.');
        setSubmitting(false);
        return;
      }

      // 2. Create appointment with pending_confirmation status
      const startAt = new Date(`${selectedDate}T${selectedTime}:00`);
      const duration = selectedProc.duration_minutes || 60;
      const endAt = new Date(startAt);
      endAt.setMinutes(startAt.getMinutes() + duration);

      const { data: newApt, error: aptErr } = await supabase
        .from('appointments')
        .insert({
          organization_id: org.id,
          client_id: clientId,
          procedure_id: selectedProc.id,
          professional_id: selectedProf ? selectedProf.id : null,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          status: 'pending_confirmation',
          source: 'online',
          notes: notes.trim() || 'Agendamento solicitado via link público.',
        })
        .select('id, start_at')
        .single();

      if (aptErr) {
        toast.error('Erro ao agendar horário. Tente novamente.');
      } else {
        setCompletedApt({
          ...newApt,
          procedure: selectedProc.name,
          professional: selectedProf?.name || 'Profissional da clínica',
          dateFormatted: new Date(startAt).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }),
          timeFormatted: selectedTime,
        });
        setStep(4);
      }
    } catch (err) {
      toast.error('Ocorreu uma falha no agendamento.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="size-12 rounded-full bg-accent flex items-center justify-center animate-pulse text-primary mb-3">
          <Sparkles className="size-6" />
        </div>
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Carregando clínica...</p>
      </div>
    );
  }

  if (notFound || !org) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <div className="size-16 rounded-full bg-accent flex items-center justify-center mb-4 text-muted-foreground">
          <MapPin className="size-8" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Clínica não encontrada</h1>
        <p className="text-sm text-muted-foreground mt-2">
          O link de agendamento pode estar incorreto ou a clínica não está mais disponível.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      
      {/* Top Header Branding */}
      <header className="border-b border-border bg-surface py-4 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/logo-horizontal.png" 
              alt="SGEstética Logo" 
              className="h-8 object-contain" 
            />
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-accent text-primary">
              Agendamento Online
            </span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {org.name}
          </span>
        </div>
      </header>

      {/* Main Content Area (Mobile First Single Column) */}
      <main className="flex-1 p-4 sm:p-6 max-w-xl w-full mx-auto space-y-6">
        
        {/* Step Indicator */}
        {step < 4 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium border-b border-border pb-3">
            <span className={cn(step >= 1 && "text-primary font-semibold")}>1. Procedimento</span>
            <ChevronRight className="size-3 text-muted-foreground/40" />
            <span className={cn(step >= 2 && "text-primary font-semibold")}>2. Horário</span>
            <ChevronRight className="size-3 text-muted-foreground/40" />
            <span className={cn(step >= 3 && "text-primary font-semibold")}>3. Seus Dados</span>
          </div>
        )}

        {/* STEP 1: Selecionar Procedimento */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
                Escolha o Tratamento
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione o serviço que deseja realizar em <strong className="text-foreground">{org.name}</strong>.
              </p>
            </div>

            {procedures.length === 0 ? (
              <div className="panel p-8 text-center text-muted-foreground">
                Nenhum tratamento disponível para agendamento online no momento.
              </div>
            ) : (
              <div className="space-y-3">
                {procedures.map(proc => (
                  <button
                    key={proc.id}
                    onClick={() => {
                      setSelectedProc(proc);
                      setStep(2);
                    }}
                    className={cn(
                      "w-full panel p-4 text-left transition-all hover:border-primary/40 flex items-center justify-between group shadow-xs",
                      selectedProc?.id === proc.id && "border-primary bg-accent/20"
                    )}
                  >
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {proc.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {proc.duration_minutes} min
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold text-primary">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.price || 0)}
                      </span>
                      <ChevronRight className="size-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Selecionar Profissional & Data / Horário */}
        {step === 2 && selectedProc && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <button 
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Trocar procedimento ({selectedProc.name})
            </button>

            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
                Data & Horário
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Escolha o profissional e o melhor dia para seu atendimento.
              </p>
            </div>

            {/* Profissional Selection (Opcional) */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block">
                Profissional (Opcional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSelectedProf(null)}
                  className={cn(
                    "p-3 rounded-xl border text-xs font-medium text-left transition-all",
                    !selectedProf ? "border-primary bg-accent/40 text-primary font-bold shadow-xs" : "border-border bg-surface text-muted-foreground hover:bg-accent"
                  )}
                >
                  Qualquer profissional
                </button>
                {professionals.map(prof => (
                  <button
                    key={prof.id}
                    onClick={() => setSelectedProf(prof)}
                    className={cn(
                      "p-3 rounded-xl border text-xs font-medium text-left transition-all truncate",
                      selectedProf?.id === prof.id ? "border-primary bg-accent/40 text-primary font-bold shadow-xs" : "border-border bg-surface text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {prof.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block">
                Data do Atendimento
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex h-11 w-full rounded-xl border border-input bg-surface px-4 text-sm font-medium focus:ring-1 focus:ring-primary shadow-xs"
              />
            </div>

            {/* Horários Disponíveis */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider block">
                Horários Livres
              </label>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {generateSlots().map(slot => {
                  const isBusy = busySlots.includes(slot);
                  const isSelected = selectedTime === slot;

                  return (
                    <button
                      key={slot}
                      disabled={isBusy}
                      onClick={() => setSelectedTime(slot)}
                      className={cn(
                        "py-2.5 rounded-xl border text-xs font-semibold transition-all text-center",
                        isBusy && "bg-accent/30 border-transparent text-muted-foreground/40 cursor-not-allowed line-through",
                        isSelected && "border-primary bg-primary text-primary-foreground shadow-sm",
                        !isBusy && !isSelected && "border-border bg-surface text-foreground hover:border-primary/50 hover:bg-accent"
                      )}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              disabled={!selectedTime}
              onClick={() => setStep(3)}
              className="w-full h-11 bg-primary text-primary-foreground font-semibold rounded-xl text-sm shadow transition-colors hover:bg-primary/90 disabled:opacity-50 mt-4"
            >
              Avançar para Seus Dados
            </button>
          </div>
        )}

        {/* STEP 3: Formulário de Contato do Cliente */}
        {step === 3 && selectedProc && selectedTime && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <button 
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              Voltar para horário ({selectedDate} às {selectedTime})
            </button>

            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
                Seus Dados de Contato
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Preencha para enviar a solicitação de agendamento à clínica.
              </p>
            </div>

            {/* Resumo da Seleção */}
            <div className="panel p-4 bg-accent/30 border-primary/20 space-y-1 text-xs">
              <div className="font-semibold text-primary uppercase tracking-wider">{selectedProc.name}</div>
              <div className="text-foreground font-medium">
                {new Date(`${selectedDate}T${selectedTime}:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} às {selectedTime}
              </div>
              <div className="text-muted-foreground">
                Profissional: {selectedProf?.name || 'Qualquer profissional'}
              </div>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Seu Nome Completo <span className="text-destructive">*</span></label>
                <input
                  required
                  placeholder="Ex: Maria Silva"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-input bg-surface px-4 text-sm font-medium focus:ring-1 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Telefone / WhatsApp <span className="text-destructive">*</span></label>
                <input
                  required
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-input bg-surface px-4 text-sm font-medium focus:ring-1 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">E-mail (Opcional)</label>
                <input
                  type="email"
                  placeholder="maria@exemplo.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-input bg-surface px-4 text-sm font-medium focus:ring-1 focus:ring-primary shadow-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Observações / Preferências</label>
                <textarea
                  placeholder="Alguma observação para a recepção?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex min-h-20 w-full rounded-xl border border-input bg-surface px-4 py-3 text-sm focus:ring-1 focus:ring-primary shadow-xs resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl text-base shadow-md transition-colors hover:bg-primary/90 disabled:opacity-50 mt-2"
              >
                {submitting ? 'Enviando Agendamento...' : 'Solicitar Agendamento'}
              </button>
            </form>
          </div>
        )}

        {/* STEP 4: Confirmação de Sucesso */}
        {step === 4 && completedApt && (
          <div className="panel p-8 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <div className="size-20 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-10" />
            </div>

            <div>
              <h1 className="text-2xl font-display font-bold tracking-tight text-foreground">
                Agendamento Solicitado!
              </h1>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
                Sua reserva para <strong className="text-foreground">{completedApt.procedure}</strong> foi pré-agendada para <strong>{completedApt.dateFormatted} às {completedApt.timeFormatted}</strong>.
              </p>
            </div>

            <div className="p-4 bg-accent/40 rounded-xl text-xs text-muted-foreground space-y-1 text-left">
              <div className="flex items-center gap-1.5 font-semibold text-primary">
                <ShieldCheck className="size-4" /> Pré-Confirmação Pendente
              </div>
              <p className="leading-relaxed">
                A recepção da clínica entrará em contato via WhatsApp/Telefone para confirmar seu horário.
              </p>
            </div>

            <button
              onClick={() => {
                setStep(1);
                setSelectedProc(null);
                setSelectedTime(null);
              }}
              className="w-full h-11 bg-accent text-primary font-semibold rounded-xl text-sm transition-colors hover:bg-accent/80"
            >
              Fazer Outro Agendamento
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
