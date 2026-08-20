import { createFileRoute, Link } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { 
  User, Phone, CalendarDays, DollarSign, ArrowLeft, 
  Plus, MessageSquare, MoreHorizontal, Activity, Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_auth/clientes/$id')({
  component: ClientePerfil,
});

type ClientProfile = {
  id: string;
  full_name: string;
  phone: string;
  whatsapp: string;
  status: string;
  created_at: string;
  birth_date?: string;
  notes?: string;
};

type AppointmentEvent = {
  id: string;
  start_at: string;
  status: string;
  procedures?: { name: string, price: number };
  professionals?: { name: string };
};

const TABS = [
  { id: 'visao-geral', label: 'Visão Geral' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'tratamentos', label: 'Tratamentos', disabled: true },
  { id: 'prontuario', label: 'Prontuário' },
  { id: 'fotos', label: 'Fotos', disabled: true },
  { id: 'financeiro', label: 'Financeiro', disabled: true },
];

function ClientePerfil() {
  const { id } = Route.useParams();
  const { tenant } = useTenant();
  
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [appointments, setAppointments] = useState<AppointmentEvent[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visao-geral');

  useEffect(() => {
    const fetchData = async () => {
      if (!tenant || !id) return;
      setLoading(true);

      // Fetch Client
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('organization_id', tenant.organization_id)
        .single();
      
      if (clientData) setClient(clientData);

      // Fetch History
      const { data: aptData } = await supabase
        .from('appointments')
        .select(`
          id, start_at, status,
          procedures(name, price),
          professionals(name)
        `)
        .eq('client_id', id)
        .order('start_at', { ascending: false });

      if (aptData) setAppointments(aptData as any);

      // Fetch Medical Records
      const { data: recordsData } = await supabase
        .from('medical_records')
        .select(`
          id, created_at, content, record_type,
          professionals(name),
          appointments(start_at, procedures(name))
        `)
        .eq('client_id', id)
        .order('created_at', { ascending: false });
        
      if (recordsData) setMedicalRecords(recordsData);

      setLoading(false);
    };

    fetchData();
  }, [id, tenant]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando perfil do cliente...</div>;
  }

  if (!client) {
    return <div className="p-8 text-center text-destructive">Cliente não encontrado.</div>;
  }

  // Calculate stats
  const totalGasto = appointments
    .filter(a => a.status === 'completed' || a.status === 'confirmed')
    .reduce((acc, a) => acc + (a.procedures?.price || 0), 0);

  const pastAppointments = appointments.filter(a => new Date(a.start_at) < new Date() && a.status !== 'cancelled');
  const futureAppointments = appointments.filter(a => new Date(a.start_at) >= new Date() && a.status !== 'cancelled');

  const ultimaVisita = pastAppointments.length > 0 ? new Date(pastAppointments[0].start_at) : null;
  const proximaVisita = futureAppointments.length > 0 ? new Date(futureAppointments[futureAppointments.length - 1].start_at) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Back navigation */}
      <Link to="/_auth/clientes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-4" />
        Voltar para clientes
      </Link>

      {/* Header Profile */}
      <div className="panel p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <User className="size-10" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground flex items-center gap-3">
              {client.full_name}
              <span className={cn(
                "px-2 py-0.5 text-xs font-medium rounded-full",
                client.status === 'active' ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
              )}>
                {client.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
              {client.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="size-4" /> {client.phone}
                </div>
              )}
              {client.birth_date && (
                <div className="flex items-center gap-1.5">
                  <Star className="size-4" /> {new Date(client.birth_date).toLocaleDateString('pt-BR')}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex h-9 items-center justify-center gap-2 rounded-md bg-secondary text-secondary-foreground px-4 text-sm font-medium shadow-sm ring-1 ring-border transition-colors hover:bg-accent">
            <MessageSquare className="size-4 text-[#25D366]" />
            WhatsApp
          </button>
          <button className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            <CalendarDays className="size-4" />
            Agendar
          </button>
          <button className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground shadow-sm ring-1 ring-border transition-colors hover:bg-accent">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="panel p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Total Gasto</span>
            <DollarSign className="size-4" />
          </div>
          <div className="text-2xl font-bold">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGasto)}
          </div>
        </div>

        <div className="panel p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Última Visita</span>
            <CalendarDays className="size-4" />
          </div>
          <div className="text-2xl font-bold">
            {ultimaVisita ? ultimaVisita.toLocaleDateString('pt-BR') : '—'}
          </div>
        </div>

        <div className="panel p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Próximo Atendimento</span>
            <Clock className="size-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-primary">
            {proximaVisita ? proximaVisita.toLocaleDateString('pt-BR') : '—'}
          </div>
        </div>

        <div className="panel p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-sm font-medium">Pacotes Ativos</span>
            <Activity className="size-4" />
          </div>
          <div className="text-2xl font-bold">0</div>
        </div>

      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                tab.disabled && "opacity-50 cursor-not-allowed hover:text-muted-foreground hover:border-transparent"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="py-2">
        
        {activeTab === 'visao-geral' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Histórico / Linha do Tempo */}
            <div className="lg:col-span-2 panel p-6">
              <h2 className="text-lg font-semibold tracking-tight mb-6">Linha do Tempo</h2>
              
              <div className="relative pl-6 border-l-2 border-accent space-y-8">
                {appointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma interação registrada ainda.</p>
                ) : (
                  appointments.map(apt => (
                    <div key={apt.id} className="relative">
                      <div className="absolute -left-[31px] top-1.5 size-3.5 rounded-full bg-primary ring-4 ring-surface" />
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">
                          {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(apt.start_at))}
                        </div>
                        <div className="bg-accent/30 rounded-lg p-4 border border-border">
                          <p className="font-medium text-foreground">
                            Agendamento: {apt.procedures?.name || 'Consulta'}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Status: <span className="uppercase text-xs font-semibold">{apt.status}</span> • Profissional: {apt.professionals?.name || 'Não atribuído'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Evento de Criação (Fixo) */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-1.5 size-3.5 rounded-full bg-border ring-4 ring-surface" />
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">
                      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(new Date(client.created_at))}
                    </div>
                    <div className="bg-accent/30 rounded-lg p-4 border border-border">
                      <p className="font-medium text-foreground">
                        Cliente cadastrado no sistema
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Informações Extras */}
            <div className="space-y-6">
              <div className="panel p-6">
                <h3 className="font-semibold text-sm mb-4">Observações Médicas</h3>
                {client.notes ? (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{client.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nenhuma anotação adicionada.</p>
                )}
                <button className="mt-4 text-xs font-medium text-primary hover:underline">
                  Editar observações
                </button>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'agenda' && (
          <div className="panel p-6 text-center text-muted-foreground">
            <CalendarDays className="size-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-foreground">Agenda do Cliente</p>
            <p className="text-sm mt-1">Visualização detalhada dos horários futuros e passados deste cliente será listada aqui.</p>
          </div>
        )}

        {activeTab === 'prontuario' && (
          <div className="panel p-6">
            <div className="flex items-center justify-between mb-6 border-b border-border pb-4">
              <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                <Activity className="size-5 text-primary" />
                Histórico Clínico e Evoluções
              </h2>
            </div>
            
            <div className="space-y-6">
              {medicalRecords.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-border rounded-xl bg-background/50 text-muted-foreground">
                  Nenhum laudo ou prontuário preenchido ainda.
                </div>
              ) : (
                medicalRecords.map(record => (
                  <div key={record.id} className="border border-border rounded-lg bg-surface overflow-hidden">
                    <div className="bg-accent/30 px-4 py-3 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {record.appointments?.procedures?.name || 'Consulta'}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{new Date(record.created_at).toLocaleDateString('pt-BR')}</div>
                        <div>Dr(a). {record.professionals?.name || 'Não identificado'}</div>
                      </div>
                    </div>
                    <div className="p-4 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {record.content || <span className="italic text-muted-foreground">Nenhuma evolução descrita.</span>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
