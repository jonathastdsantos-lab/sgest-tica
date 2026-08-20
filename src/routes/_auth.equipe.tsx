import { createFileRoute } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { UsersRound, Plus, MoreHorizontal, User, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_auth/equipe')({
  component: Equipe,
});

type Professional = {
  id: string;
  name: string;
  role: string;
  phone: string;
  status: string;
  created_at: string;
};

function Equipe() {
  const { tenant } = useTenant();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTeam = async () => {
    if (!tenant) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('organization_id', tenant.organization_id)
      .order('name', { ascending: true });

    if (!error && data) {
      setProfessionals(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTeam();
  }, [tenant]);

  const handleCreateProfessional = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);
    
    // Simples insert
    const { error } = await supabase.from('professionals').insert({
      organization_id: tenant.organization_id,
      name: newName,
      role: newRole || 'Especialista',
    });

    if (!error) {
      setIsModalOpen(false);
      setNewName('');
      setNewRole('');
      fetchTeam();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-foreground flex items-center gap-2">
            <UsersRound className="size-6 text-primary" />
            Equipe & Profissionais
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os especialistas, médicos e atendentes da sua clínica.
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Novo Profissional
        </button>
      </div>

      {/* Grid de Profissionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full h-64 flex items-center justify-center text-muted-foreground">
            Carregando equipe...
          </div>
        ) : professionals.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 panel text-center">
            <div className="size-14 rounded-full bg-accent flex items-center justify-center mb-3 text-muted-foreground">
              <UsersRound className="size-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Nenhum profissional encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1">Adicione o primeiro membro da sua equipe.</p>
          </div>
        ) : (
          professionals.map(prof => (
            <div key={prof.id} className="panel p-5 relative overflow-hidden group shadow-xs">
              <button className="absolute right-3 top-3 p-1.5 text-muted-foreground hover:bg-accent rounded-md opacity-0 group-hover:opacity-100 transition-all">
                <MoreHorizontal className="size-4" />
              </button>
              
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-full bg-accent flex items-center justify-center text-primary shrink-0 font-semibold">
                  <User className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground leading-tight">{prof.name}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 font-medium">
                    <ShieldCheck className="size-3.5 text-primary" />
                    {prof.role}
                  </p>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-xs font-semibold",
                  prof.status === 'active' ? "bg-success/10 text-success" : "bg-accent text-muted-foreground"
                )}>
                  {prof.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
                
                <button className="text-xs font-semibold text-primary hover:underline">
                  Ver Agenda
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-border animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-semibold tracking-tight mb-1">Novo Profissional</h2>
            <p className="text-sm text-muted-foreground mb-6">Adicione um novo membro à equipe.</p>
            
            <form onSubmit={handleCreateProfessional} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <input
                  required
                  autoFocus
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Especialidade / Cargo</label>
                <input
                  required
                  placeholder="Ex: Dermatologista, Biomédica"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
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
                  disabled={saving}
                  className="flex h-10 flex-1 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Profissional'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
