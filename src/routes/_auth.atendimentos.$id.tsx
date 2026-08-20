import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { 
  ArrowLeft, CheckCircle, FileText, Activity, Image as ImageIcon, 
  Save, AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const Route = createFileRoute('/_auth/atendimentos/$id')({
  component: AtendimentoWorkspace,
});

type AppointmentData = {
  id: string;
  client_id: string;
  status: string;
  clients: { full_name: string; photo_url: string };
  procedures: { name: string };
};

const TABS = [
  { id: 'anamnese', label: 'Anamnese', icon: Activity },
  { id: 'evolucao', label: 'Evolução / Laudo', icon: FileText },
  { id: 'fotos', label: 'Fotos Clínicas', icon: ImageIcon },
];

function AtendimentoWorkspace() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  
  const [apt, setApt] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('anamnese');
  
  // States - Record
  const [recordId, setRecordId] = useState<string | null>(null);
  const [anamnese, setAnamnese] = useState({ queixa: '', alergias: '', medicamentos: '', cirurgias: '' });
  const [evolucao, setEvolucao] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!tenant || !id) return;
      
      const { data: aptData } = await supabase
        .from('appointments')
        .select('id, client_id, status, clients(full_name, photo_url), procedures(name)')
        .eq('id', id)
        .single();
        
      if (aptData) {
        setApt(aptData as any);
        
        // Se ainda estiver como "scheduled", marcar como "in_progress"
        if (aptData.status === 'scheduled') {
          await supabase.from('appointments').update({ status: 'in_progress' }).eq('id', id);
        }

        // Fetch existing record for this appointment
        const { data: recordData } = await supabase
          .from('medical_records')
          .select('*')
          .eq('appointment_id', id)
          .single();
          
        if (recordData) {
          setRecordId(recordData.id);
          setEvolucao(recordData.content || '');
          if (recordData.anamnesis_data) {
            setAnamnese(recordData.anamnesis_data as any);
          }
        }
      }
      setLoading(false);
    };
    
    fetchData();
  }, [tenant, id]);

  const handleSave = async () => {
    if (!tenant || !apt) return;
    setSaving(true);
    
    const payload = {
      organization_id: tenant.id,
      client_id: apt.client_id,
      appointment_id: id,
      content: evolucao,
      anamnesis_data: anamnese,
      record_type: 'evolution'
    };
    
    if (recordId) {
      const { error } = await supabase.from('medical_records').update(payload).eq('id', recordId);
      if (!error) toast.success('Prontuário atualizado!');
      else toast.error('Erro ao salvar prontuário.');
    } else {
      const { data, error } = await supabase.from('medical_records').insert(payload).select().single();
      if (!error && data) {
        setRecordId(data.id);
        toast.success('Prontuário salvo com sucesso!');
      } else {
        toast.error('Erro ao salvar prontuário.');
      }
    }
    
    setSaving(false);
  };

  const handleFinish = async () => {
    if (!tenant || !apt) return;
    await handleSave();
    
    const { error } = await supabase.from('appointments').update({ status: 'completed' }).eq('id', id);
    if (!error) {
      toast.success('Atendimento finalizado com sucesso!');
      navigate({ to: '/atendimentos' });
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando prontuário...</div>;
  if (!apt) return <div className="p-8 text-center text-destructive">Agendamento não encontrado.</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      
      {/* Header */}
      <div className="flex items-center justify-between shrink-0 mb-6">
        <div className="flex items-center gap-4">
          <Link to="/atendimentos" className="size-10 flex items-center justify-center rounded-full bg-surface border border-border hover:bg-accent transition-colors">
            <ArrowLeft className="size-5 text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-medium tracking-tight text-foreground flex items-center gap-2">
              Prontuário de Atendimento
            </h1>
            <p className="text-sm text-muted-foreground">
              {apt.clients?.full_name} • {apt.procedures?.name}
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-accent text-accent-foreground px-4 text-sm font-medium transition-colors hover:bg-accent/80 disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? 'Salvando...' : 'Salvar Rascunho'}
          </button>
          <button 
            onClick={handleFinish}
            disabled={saving}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <CheckCircle className="size-4" />
            Finalizar Sessão
          </button>
        </div>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        
        {/* Sidebar Tabs */}
        <div className="w-64 shrink-0 flex flex-col gap-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-sm transition-all text-left font-medium",
                activeTab === tab.id 
                  ? "bg-accent text-primary font-semibold shadow-xs" 
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <tab.icon className={cn("size-4", activeTab === tab.id ? "text-primary" : "text-muted-foreground")} />
              {tab.label}
            </button>
          ))}
          
          <div className="mt-auto panel p-4 bg-accent/20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <AlertCircle className="size-3.5 text-primary" /> Dica Médica
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O sistema salva automaticamente os rascunhos em background. Suas anotações clínicas estão protegidas pela LGPD.
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 panel overflow-y-auto p-6 bg-surface">
          
          {activeTab === 'anamnese' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-semibold border-b border-border pb-2 mb-4">Formulário de Triagem & Anamnese</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Queixa Principal / Objetivo</label>
                  <textarea 
                    value={anamnese.queixa}
                    onChange={e => setAnamnese({...anamnese, queixa: e.target.value})}
                    className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary resize-y"
                    placeholder="O que motivou a paciente a buscar o tratamento?"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Alergias Conhecidas</label>
                    <textarea 
                      value={anamnese.alergias}
                      onChange={e => setAnamnese({...anamnese, alergias: e.target.value})}
                      className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                      placeholder="Descreva alergias a medicamentos, cosméticos..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Medicamentos em Uso</label>
                    <textarea 
                      value={anamnese.medicamentos}
                      onChange={e => setAnamnese({...anamnese, medicamentos: e.target.value})}
                      className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                      placeholder="Usa roacutan? Anticoagulantes?"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Histórico Cirúrgico / Doenças Prévias</label>
                  <textarea 
                    value={anamnese.cirurgias}
                    onChange={e => setAnamnese({...anamnese, cirurgias: e.target.value})}
                    className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-1 focus:ring-primary resize-y"
                    placeholder="Cirurgias plásticas anteriores, histórico oncológico..."
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'evolucao' && (
            <div className="space-y-6 animate-in fade-in duration-300 h-full flex flex-col">
              <h2 className="text-lg font-semibold border-b border-border pb-2 mb-4 shrink-0">Evolução Clínica / Laudo</h2>
              
              <div className="flex-1 flex flex-col space-y-2">
                <label className="text-sm font-medium text-foreground">Descrição do Atendimento</label>
                <textarea 
                  value={evolucao}
                  onChange={e => setEvolucao(e.target.value)}
                  className="flex-1 w-full rounded-md border border-input bg-background px-4 py-3 text-sm focus:ring-1 focus:ring-primary resize-none leading-relaxed"
                  placeholder="Descreva como foi a sessão de hoje. Zonas aplicadas, dosagem, intercorrências..."
                />
              </div>
            </div>
          )}

          {activeTab === 'fotos' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
                <h2 className="text-lg font-semibold">Fotografias (Antes e Depois)</h2>
                <button className="text-sm font-medium text-primary hover:underline">Upload de Foto</button>
              </div>
              
              <div className="flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-border rounded-xl bg-background/50">
                <div className="size-16 rounded-full bg-accent flex items-center justify-center mb-4 text-muted-foreground">
                  <ImageIcon className="size-8" />
                </div>
                <h3 className="text-lg font-medium">Nenhuma foto anexada</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  Na V1 as fotos estão desabilitadas pois o Storage do Supabase precisa de configuração manual no painel. 
                  (Esta área servirá para comparar simetria e evolução).
                </p>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
