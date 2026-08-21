import { createFileRoute, Link } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Plus, Search, Users, Phone, MoreHorizontal, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/_auth/clientes/')({
  component: Clientes,
});

type Client = {
  id: string;
  full_name: string;
  phone: string;
  whatsapp: string;
  status: string;
  created_at: string;
};

function Clientes() {
  const { tenant } = useTenant();
  const [clientes, setClientes] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchClientes = async () => {
    if (!tenant) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        packages(id, status)
      `)
      .eq('organization_id', tenant.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setClientes(data as any);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchClientes();
  }, [tenant]);

  const filteredClientes = clientes.filter(c => 
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  );

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSaving(true);
    
    const { error } = await supabase.from('clients').insert({
      organization_id: tenant.id,
      full_name: newClientName,
      phone: newClientPhone,
      whatsapp: newClientPhone,
    });

    if (!error) {
      setIsModalOpen(false);
      setNewClientName('');
      setNewClientPhone('');
      fetchClientes();
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-6 text-primary" />
            Clientes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie o cadastro e histórico dos seus clientes.
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Novo Cliente
        </button>
      </div>

      {/* Tabela / Lista */}
      <div className="panel overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou telefone..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Listagem */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-accent/50 text-muted-foreground">
                <th className="px-6 py-3 font-medium">Cliente</th>
                <th className="px-6 py-3 font-medium">Contato</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Cadastro</th>
                <th className="px-6 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    Carregando clientes...
                  </td>
                </tr>
              ) : filteredClientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="size-14 rounded-full bg-accent flex items-center justify-center mb-3 text-muted-foreground">
                        <Users className="size-6" />
                      </div>
                      <p className="font-semibold text-foreground">Nenhum cliente encontrado</p>
                      <p className="text-sm text-muted-foreground mt-1">Comece adicionando seu primeiro cliente.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-6 py-4">
                      <Link to="/clientes/$id" params={{ id: cliente.id }} className="flex items-center gap-3 group">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors font-semibold text-xs">
                          <User className="size-4" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{cliente.full_name}</span>
                          {(cliente as any).packages?.filter((p: any) => p.status === 'active').length > 0 && (
                            <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {(cliente as any).packages.filter((p: any) => p.status === 'active').length} {(cliente as any).packages.filter((p: any) => p.status === 'active').length === 1 ? 'pacote ativo' : 'pacotes ativos'}
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      {cliente.phone ? (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="size-3.5" />
                          <span>{cliente.phone}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Sem telefone</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        cliente.status === 'active' ? "bg-success/10 text-success" : "bg-accent text-muted-foreground"
                      )}>
                        {cliente.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(cliente.created_at))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-accent rounded-md text-muted-foreground transition-colors">
                        <MoreHorizontal className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Criação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl ring-1 ring-border animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-semibold tracking-tight mb-1">Novo Cliente</h2>
            <p className="text-sm text-muted-foreground mb-6">Cadastro rápido para agendamentos e vendas.</p>
            
            <form onSubmit={handleCreateClient} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <input
                  required
                  autoFocus
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Maria Silva"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">WhatsApp / Telefone</label>
                <input
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="(11) 99999-9999"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
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
                  {saving ? 'Salvando...' : 'Salvar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
