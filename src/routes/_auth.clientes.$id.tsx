import { createFileRoute, Link } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { 
  User, Phone, CalendarDays, DollarSign, ArrowLeft, 
  Plus, MessageSquare, MoreHorizontal, Activity, Star, Camera, ShieldAlert, ShieldCheck,
  Package as PackageIcon, Layers, CheckCircle2, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ClinicalPhotosGallery } from '@/components/clinical-photos-gallery';

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
  photo_consent?: boolean;
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
  { id: 'prontuario', label: 'Prontuário' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'pacotes', label: 'Pacotes' },
];

function ClientePerfil() {
  const { id } = Route.useParams();
  const { tenant } = useTenant();
  
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [appointments, setAppointments] = useState<AppointmentEvent[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
  const [packagesList, setPackagesList] = useState<any[]>([]);
  const [proceduresList, setProceduresList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('visao-geral');

  // Package Modal State
  const [isPkgModalOpen, setIsPkgModalOpen] = useState(false);
  const [pkgProcedureId, setPkgProcedureId] = useState('');
  const [pkgTotalSessions, setPkgTotalSessions] = useState('10');
  const [pkgPricePaid, setPkgPricePaid] = useState('');
  const [pkgExpiresAt, setPkgExpiresAt] = useState('');
  const [savingPkg, setSavingPkg] = useState(false);

  const fetchPackagesData = async () => {
    if (!tenant || !id) return;
    
    const { data: pkgsData } = await supabase
      .from('packages')
      .select(`
        id, total_sessions, price_paid, purchased_at, expires_at, status, procedure_id,
        procedures(name, price),
        package_sessions(id)
      `)
      .eq('client_id', id)
      .order('created_at', { ascending: false });

    if (pkgsData) setPackagesList(pkgsData);

    const { data: procData } = await supabase
      .from('procedures')
      .select('id, name, price')
      .eq('organization_id', tenant.organization_id)
      .order('name', { ascending: true });

    if (procData) setProceduresList(procData);
  };

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

      await fetchPackagesData();
      setLoading(false);
    };

    fetchData();
  }, [id, tenant]);

  const handleToggleConsent = async () => {
    if (!client) return;
    const nextConsent = !client.photo_consent;
    const { error } = await supabase
      .from('clients')
      .update({ photo_consent: nextConsent })
      .eq('id', client.id);

    if (!error) {
      setClient({ ...client, photo_consent: nextConsent });
      toast.success(nextConsent ? 'Uso de imagem AUTORIZADO' : 'Uso de imagem REVOGADO');
    }
  };

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !client) return;
    setSavingPkg(true);

    const { error } = await supabase.from('packages').insert({
      organization_id: tenant.organization_id,
      client_id: client.id,
      procedure_id: pkgProcedureId || null,
      total_sessions: Number(pkgTotalSessions) || 10,
      price_paid: Number(pkgPricePaid) || 0,
      expires_at: pkgExpiresAt ? new Date(pkgExpiresAt).toISOString() : null,
      status: 'active',
    });

    if (!error) {
      toast.success('Pacote de sessões cadastrado com sucesso!');
      setIsPkgModalOpen(false);
      setPkgProcedureId('');
      setPkgTotalSessions('10');
      setPkgPricePaid('');
      setPkgExpiresAt('');
      await fetchPackagesData();
    } else {
      toast.error('Erro ao cadastrar pacote.');
    }
    setSavingPkg(false);
  };

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
      <Link to="/clientes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="size-4" />
        Voltar para clientes
      </Link>

      {/* Header Profile */}
      <div className="panel p-6 flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="size-16 rounded-full bg-accent flex items-center justify-center text-primary shrink-0 font-semibold">
            <User className="size-8" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold tracking-tight text-foreground flex items-center gap-3">
              {client.full_name}
              <span className={cn(
                "px-2.5 py-0.5 text-xs font-semibold rounded-full",
                client.status === 'active' ? "bg-success/10 text-success" : "bg-accent text-muted-foreground"
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
              
              {/* Consent Toggle Button */}
              <button
                type="button"
                onClick={handleToggleConsent}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border",
                  client.photo_consent 
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20 dark:text-emerald-300"
                    : "bg-amber-500/10 text-amber-700 border-amber-500/30 hover:bg-amber-500/20 dark:text-amber-300"
                )}
                title="Clique para alterar o consentimento de uso de imagem do cliente"
              >
                {client.photo_consent ? <ShieldCheck className="size-3.5" /> : <ShieldAlert className="size-3.5" />}
                {client.photo_consent ? 'Uso de Imagem Autorizado' : 'Uso de Imagem Não Autorizado'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button className="flex h-9 items-center justify-center gap-2 rounded-md bg-accent text-accent-foreground px-4 text-sm font-medium transition-colors hover:bg-accent/80">
            <MessageSquare className="size-4 text-[#25D366]" />
            WhatsApp
          </button>
          <button className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90">
            <CalendarDays className="size-4" />
            Agendar
          </button>
          <button className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground transition-colors hover:bg-accent/80">
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards (panel + panel-accent) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="panel panel-accent p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Gasto</span>
            <DollarSign className="size-4" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalGasto)}
          </div>
        </div>

        <div className="panel panel-accent p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Última Visita</span>
            <CalendarDays className="size-4" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {ultimaVisita ? ultimaVisita.toLocaleDateString('pt-BR') : '—'}
          </div>
        </div>

        <div className="panel panel-accent p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Próximo Atendimento</span>
            <Activity className="size-4 text-primary" />
          </div>
          <div className="text-2xl font-bold text-primary">
            {proximaVisita ? proximaVisita.toLocaleDateString('pt-BR') : '—'}
          </div>
        </div>

        <div className="panel panel-accent p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Pacotes Ativos</span>
            <Star className="size-4" />
          </div>
          <div className="text-2xl font-bold text-foreground">0</div>
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

        {activeTab === 'fotos' && (
          <div className="animate-in fade-in duration-300">
            <ClinicalPhotosGallery clientId={client.id} />
          </div>
        )}

        {activeTab === 'pacotes' && (
          <div className="panel p-6 space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                  <PackageIcon className="size-5 text-primary" />
                  Pacotes de Sessões
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Sessões contratadas em lote com controle de saldo disponível.
                </p>
              </div>
              <button
                onClick={() => setIsPkgModalOpen(true)}
                className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                <Plus className="size-4" />
                Novo Pacote
              </button>
            </div>

            {packagesList.length === 0 ? (
              <div className="text-center p-12 border-2 border-dashed border-border rounded-xl bg-background/50 text-muted-foreground flex flex-col items-center justify-center">
                <div className="size-14 rounded-full bg-accent flex items-center justify-center mb-3 text-muted-foreground">
                  <PackageIcon className="size-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-base">Nenhum pacote ativo</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Cadastre um pacote de sessões (ex: 10 sessões de depilação a laser ou drenagem) para descontar automaticamente na agenda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packagesList.map(pkg => {
                  const usedCount = pkg.package_sessions?.length || 0;
                  const balance = Math.max(0, pkg.total_sessions - usedCount);
                  const progressPct = Math.min(100, Math.round((usedCount / pkg.total_sessions) * 100));

                  return (
                    <div key={pkg.id} className="panel p-5 space-y-4 hover:border-primary/40 transition-all shadow-xs relative">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-semibold text-primary uppercase tracking-wider block">
                            {pkg.procedures?.name || 'Tratamento / Pacote Geral'}
                          </span>
                          <h3 className="text-xl font-bold text-foreground mt-1">
                            {balance} <span className="text-sm font-normal text-muted-foreground">de {pkg.total_sessions} sessões restantes</span>
                          </h3>
                        </div>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0",
                          balance > 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-accent text-muted-foreground"
                        )}>
                          {balance > 0 ? 'Ativo' : 'Concluído'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progresso</span>
                          <span>{usedCount} / {pkg.total_sessions} ({progressPct}%)</span>
                        </div>
                        <div className="h-2 w-full bg-accent rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-500 rounded-full" 
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                        <span>Valor: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pkg.price_paid || 0)}</span>
                        {pkg.expires_at && (
                          <span>Validade: {new Date(pkg.expires_at).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Novo Pacote */}
        {isPkgModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-border animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold tracking-tight text-foreground">Novo Pacote de Sessões</h2>
                <button onClick={() => setIsPkgModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="size-5" />
                </button>
              </div>

              <form onSubmit={handleCreatePackage} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Procedimento Vinculado</label>
                  <select
                    value={pkgProcedureId}
                    onChange={(e) => setPkgProcedureId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Selecione o procedimento...</option>
                    {proceduresList.map(proc => (
                      <option key={proc.id} value={proc.id}>
                        {proc.name} ({new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Total de Sessões</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={pkgTotalSessions}
                      onChange={(e) => setPkgTotalSessions(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">Preço Pago (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={pkgPricePaid}
                      onChange={(e) => setPkgPricePaid(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Validade (Opcional)</label>
                  <input
                    type="date"
                    value={pkgExpiresAt}
                    onChange={(e) => setPkgExpiresAt(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPkgModalOpen(false)}
                    className="flex h-10 flex-1 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingPkg}
                    className="flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingPkg ? 'Salvando...' : 'Criar Pacote'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
