import { createFileRoute } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Settings, Building2, MapPin, Syringe, UserCircle, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_auth/configuracoes')({
  component: Configuracoes,
});

const TABS = [
  { id: 'clinica', label: 'Clínica', icon: Building2 },
  { id: 'unidades', label: 'Unidades', icon: MapPin },
  { id: 'procedimentos', label: 'Procedimentos', icon: Syringe },
  { id: 'conta', label: 'Minha Conta', icon: UserCircle },
];

type Procedure = {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  active: boolean;
};

function Configuracoes() {
  const { tenant } = useTenant();
  const [activeTab, setActiveTab] = useState('procedimentos'); // defaulting to procedures for V1 showcase

  // Procedures State
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loadingProcedures, setLoadingProcedures] = useState(false);
  const [isProcModalOpen, setIsProcModalOpen] = useState(false);
  
  // Procedure Form State
  const [procName, setProcName] = useState('');
  const [procPrice, setProcPrice] = useState('');
  const [procDuration, setProcDuration] = useState('60');
  const [savingProc, setSavingProc] = useState(false);

  const fetchProcedures = async () => {
    if (!tenant) return;
    setLoadingProcedures(true);
    const { data } = await supabase
      .from('procedures')
      .select('*')
      .eq('organization_id', tenant.id)
      .order('name', { ascending: true });
    
    if (data) setProcedures(data);
    setLoadingProcedures(false);
  };

  useEffect(() => {
    if (activeTab === 'procedimentos') {
      fetchProcedures();
    }
  }, [activeTab, tenant]);

  const handleCreateProcedure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSavingProc(true);

    const { error } = await supabase.from('procedures').insert({
      organization_id: tenant.id,
      name: procName,
      price: Number(procPrice) || 0,
      duration_minutes: Number(procDuration) || 60,
    });

    if (!error) {
      setIsProcModalOpen(false);
      setProcName('');
      setProcPrice('');
      setProcDuration('60');
      fetchProcedures();
    }
    setSavingProc(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-foreground flex items-center gap-2">
            <Settings className="size-6 text-primary" />
            Configurações
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os dados da clínica, unidades e serviços prestados.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
        
        {/* Sidebar Settings */}
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-2.5 rounded-full text-sm font-medium transition-all text-left",
                  activeTab === tab.id 
                    ? "bg-accent text-primary font-semibold shadow-xs" 
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className={cn("size-4", activeTab === tab.id ? "text-primary" : "text-muted-foreground")} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 panel overflow-y-auto bg-surface">
          
          {/* TAB: PROCEDIMENTOS */}
          {activeTab === 'procedimentos' && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Procedimentos e Tratamentos</h2>
                  <p className="text-sm text-muted-foreground">Serviços que sua clínica oferece para agendamento.</p>
                </div>
                <button
                  onClick={() => setIsProcModalOpen(true)}
                  className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
                >
                  <Plus className="size-4" />
                  Novo
                </button>
              </div>

              {loadingProcedures ? (
                <div className="py-12 text-center text-muted-foreground">Carregando procedimentos...</div>
              ) : procedures.length === 0 ? (
                <div className="py-12 text-center flex flex-col items-center justify-center">
                  <div className="size-14 rounded-full bg-accent flex items-center justify-center mb-3 text-muted-foreground">
                    <Syringe className="size-6" />
                  </div>
                  <p className="font-semibold text-foreground">Nenhum procedimento cadastrado</p>
                  <p className="text-sm text-muted-foreground mt-1">Cadastre um tratamento para poder usar na Agenda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {procedures.map(proc => (
                    <div key={proc.id} className="panel p-4 hover:border-primary/40 transition-all shadow-xs">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-foreground leading-tight">{proc.name}</h3>
                        <span className={cn(
                          "size-2 rounded-full mt-1.5 shrink-0",
                          proc.active ? "bg-success" : "bg-muted-foreground"
                        )} />
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span className="text-sm font-bold text-primary">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(proc.price)}
                        </span>
                        <span className="text-xs font-medium text-accent-foreground bg-accent px-2.5 py-0.5 rounded-full">
                          {proc.duration_minutes} min
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: OUTRAS */}
          {activeTab !== 'procedimentos' && (
            <div className="p-6 text-center py-20 text-muted-foreground">
              <Settings className="size-12 mx-auto mb-4 opacity-20" />
              <h2 className="text-lg font-medium text-foreground mb-1">Seção em desenvolvimento</h2>
              <p className="text-sm">As configurações de {TABS.find(t => t.id === activeTab)?.label} estarão disponíveis em breve.</p>
            </div>
          )}

        </div>
      </div>

      {/* Modal Procedimento */}
      {isProcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-border animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-semibold tracking-tight mb-1">Novo Procedimento</h2>
            <p className="text-sm text-muted-foreground mb-6">Cadastre um serviço oferecido pela clínica.</p>
            
            <form onSubmit={handleCreateProcedure} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome do Procedimento</label>
                <input
                  required
                  autoFocus
                  placeholder="Ex: Preenchimento Labial"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={procName}
                  onChange={(e) => setProcName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor (R$)</label>
                  <input
                    type="number"
                    required
                    placeholder="1500"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={procPrice}
                    onChange={(e) => setProcPrice(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duração (Minutos)</label>
                  <input
                    type="number"
                    required
                    placeholder="60"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={procDuration}
                    onChange={(e) => setProcDuration(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsProcModalOpen(false)}
                  className="flex h-10 flex-1 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProc}
                  className="flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {savingProc ? 'Salvando...' : 'Salvar Procedimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
