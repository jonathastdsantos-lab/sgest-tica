import { createFileRoute } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { TrendingUp, Plus, MoreHorizontal } from 'lucide-react';

export const Route = createFileRoute('/_auth/crm')({
  component: Crm,
});

type Stage = {
  id: string;
  name: string;
  position: number;
};

type Lead = {
  id: string;
  client_id: string;
  stage_id: string;
  title: string;
  value: number;
  clients: { full_name: string };
};

type Client = { id: string; full_name: string };

function Crm() {
  const { tenant, currentUnit } = useTenant();
  
  const [stages, setStages] = useState<Stage[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [leadTitle, setLeadTitle] = useState('');
  const [leadValue, setLeadValue] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCrmData = async () => {
    if (!tenant) return;
    setLoading(true);

    // Get primary pipeline (first one)
    const { data: pipelines } = await supabase
      .from('crm_pipelines')
      .select('id')
      .eq('organization_id', tenant.id)
      .limit(1);

    if (pipelines && pipelines.length > 0) {
      const pipelineId = pipelines[0].id;

      const { data: stagesData } = await supabase
        .from('crm_stages')
        .select('id, name, position')
        .eq('pipeline_id', pipelineId)
        .order('position', { ascending: true });

      if (stagesData) {
        setStages(stagesData);
      }

      let leadsQuery = supabase
        .from('leads')
        .select(`
          id, client_id, stage_id, title, value,
          clients(full_name)
        `)
        .eq('organization_id', tenant.id);

      if (currentUnit) leadsQuery = leadsQuery.eq('unit_id', currentUnit.id);

      const { data: leadsData } = await leadsQuery;

      if (leadsData) {
        setLeads(leadsData as unknown as Lead[]);
      }
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
    fetchCrmData();
  }, [tenant]);

  useEffect(() => {
    if (isModalOpen) fetchClientsForSelect();
  }, [isModalOpen]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !selectedClient || stages.length === 0) return;
    setSaving(true);
    
    const { error } = await supabase.from('leads').insert({
      organization_id: tenant.id,
      unit_id: currentUnit ? currentUnit.id : null,
      client_id: selectedClient,
      stage_id: stages[0].id, // First stage
      title: leadTitle || 'Oportunidade',
      value: Number(leadValue) || 0,
      status: 'open'
    });

    if (!error) {
      setIsModalOpen(false);
      setSelectedClient('');
      setLeadTitle('');
      setLeadValue('');
      fetchCrmData();
    }
    setSaving(false);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-foreground flex items-center gap-2">
            <TrendingUp className="size-6 text-primary" />
            CRM & Vendas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acompanhe suas oportunidades de venda no funil.
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Novo Lead
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Carregando funil de vendas...
          </div>
        ) : stages.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Nenhum funil configurado.
          </div>
        ) : (
          <div className="flex h-full gap-4 min-h-[500px]">
            {stages.map(stage => {
              const stageLeads = leads.filter(l => l.stage_id === stage.id);
              const stageValue = stageLeads.reduce((acc, l) => acc + (l.value || 0), 0);

              return (
                <div key={stage.id} className="flex flex-col w-[320px] shrink-0 panel bg-accent/20 overflow-hidden">
                  
                  <div className="p-4 border-b border-border bg-surface">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-sm text-foreground">{stage.name}</h3>
                      <span className="text-xs font-semibold bg-accent text-primary px-2.5 py-0.5 rounded-full">
                        {stageLeads.length}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {formatCurrency(stageValue)}
                    </div>
                  </div>

                  <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                    {stageLeads.map(lead => (
                      <div key={lead.id} className="panel p-4 hover:border-primary/40 transition-all cursor-grab group relative shadow-xs">
                        
                        <button className="absolute right-3 top-3 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent rounded-md">
                          <MoreHorizontal className="size-4" />
                        </button>

                        <div className="text-xs font-semibold text-primary mb-1">{lead.title}</div>
                        <div className="font-semibold text-sm text-foreground mb-2">{lead.clients?.full_name}</div>
                        <div className="text-xs font-semibold text-muted-foreground">
                          {formatCurrency(lead.value)}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Novo Lead */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-border animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-semibold tracking-tight mb-1">Novo Lead</h2>
            <p className="text-sm text-muted-foreground mb-6">Adicione uma nova oportunidade de venda.</p>
            
            <form onSubmit={handleCreateLead} className="space-y-4">
              
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
                  <p className="text-xs text-destructive mt-1">Nenhum cliente cadastrado.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Título da Oportunidade</label>
                <input
                  required
                  placeholder="Ex: Interesse em Harmonização"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={leadTitle}
                  onChange={(e) => setLeadTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Valor Estimado (R$)</label>
                <input
                  type="number"
                  placeholder="Ex: 1500"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={leadValue}
                  onChange={(e) => setLeadValue(e.target.value)}
                />
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
                  {saving ? 'Salvando...' : 'Salvar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
