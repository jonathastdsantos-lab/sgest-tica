import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useTenant } from "@/hooks/use-tenant";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { 
  ArrowUpRight, ArrowDownRight, DollarSign, Wallet, Plus, 
  TrendingUp, CalendarDays, Activity, MoreHorizontal, CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell 
} from "recharts";

export const Route = createFileRoute("/_auth/financeiro")({
  head: () => ({
    meta: [{ title: "Financeiro | SGEstética" }],
  }),
  component: Financeiro,
});

type Transaction = {
  id: string;
  transaction_type: 'income' | 'expense';
  amount: number;
  description: string;
  status: 'pending' | 'paid' | 'cancelled' | 'overdue';
  due_date: string;
  created_at: string;
};

const brl = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

function Financeiro() {
  const { tenant, currentUnit } = useTenant();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Formulário Modal
  const [form, setForm] = useState({
    type: 'income',
    description: '',
    amount: '',
    status: 'paid',
    due_date: new Date().toISOString().split('T')[0]
  });

  const fetchData = async () => {
    if (!tenant) return;
    setLoading(true);

    let query = supabase
      .from('financial_transactions')
      .select('*')
      .eq('organization_id', tenant.id)
      .order('created_at', { ascending: false });

    if (currentUnit) {
      query = query.eq('unit_id', currentUnit.id);
    }

    const { data, error } = await query;
    if (error) {
      toast.error('Erro ao buscar transações.');
    } else {
      setTransactions(data as Transaction[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [tenant, currentUnit]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    setSubmitting(true);

    const payload = {
      organization_id: tenant.id,
      unit_id: currentUnit?.id || null,
      transaction_type: form.type,
      description: form.description,
      amount: parseFloat(form.amount.replace(',', '.')),
      status: form.status,
      due_date: form.due_date,
      paid_at: form.status === 'paid' ? new Date().toISOString() : null
    };

    const { error } = await supabase.from('financial_transactions').insert(payload);
    if (error) {
      toast.error('Erro ao salvar transação.');
    } else {
      toast.success('Lançamento adicionado com sucesso!');
      setIsModalOpen(false);
      setForm({
        type: 'income', description: '', amount: '', status: 'paid', due_date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    }
    setSubmitting(false);
  };

  // KPIs
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  const currentMonthTransactions = transactions.filter(t => {
    const d = new Date(t.due_date || t.created_at);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.status !== 'cancelled';
  });

  const receitasPagas = currentMonthTransactions.filter(t => t.transaction_type === 'income' && t.status === 'paid').reduce((acc, t) => acc + Number(t.amount), 0);
  const despesasPagas = currentMonthTransactions.filter(t => t.transaction_type === 'expense' && t.status === 'paid').reduce((acc, t) => acc + Number(t.amount), 0);
  const aReceber = currentMonthTransactions.filter(t => t.transaction_type === 'income' && t.status === 'pending').reduce((acc, t) => acc + Number(t.amount), 0);
  const lucro = receitasPagas - despesasPagas;

  // Chart Data preparation (Last 6 months)
  const chartData = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const m = d.getMonth();
    const y = d.getFullYear();
    const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });
    
    const monthTxs = transactions.filter(t => {
      const td = new Date(t.due_date || t.created_at);
      return td.getMonth() === m && td.getFullYear() === y && t.status === 'paid';
    });

    const inc = monthTxs.filter(t => t.transaction_type === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
    const exp = monthTxs.filter(t => t.transaction_type === 'expense').reduce((acc, t) => acc + Number(t.amount), 0);
    
    chartData.push({
      name: monthName,
      Receitas: inc,
      Despesas: exp,
      Lucro: inc - exp
    });
  }

  return (
    <AppShell>
      {/* Header Personalizado (Sem props no AppShell) */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-display font-medium tracking-tight text-foreground flex items-center gap-2">
            Gestão Financeira
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe o fluxo de caixa, receitas e despesas da clínica.
          </p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          <Plus className="size-4" />
          Novo Lançamento
        </button>
      </div>

      {/* Modal Novo Lançamento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-xl relative animate-in zoom-in-95">
            <h2 className="text-lg font-semibold mb-4">Adicionar Transação</h2>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm({...form, type: 'income'})}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md border",
                    form.type === 'income' ? "bg-success/10 border-success text-success" : "bg-background border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  <ArrowUpRight className="size-4" /> Receita
                </button>
                <button
                  type="button"
                  onClick={() => setForm({...form, type: 'expense'})}
                  className={cn(
                    "flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md border",
                    form.type === 'expense' ? "bg-destructive/10 border-destructive text-destructive" : "bg-background border-border text-muted-foreground hover:bg-accent"
                  )}
                >
                  <ArrowDownRight className="size-4" /> Despesa
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <input 
                  required
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-primary"
                  placeholder="Ex: Pagamento Consulta, Aluguel..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valor (R$)</label>
                  <input 
                    required
                    type="number" step="0.01" min="0"
                    value={form.amount}
                    onChange={e => setForm({...form, amount: e.target.value})}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-primary"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Data (Venc/Pagto)</label>
                  <input 
                    required type="date"
                    value={form.due_date}
                    onChange={e => setForm({...form, due_date: e.target.value})}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select 
                  value={form.status}
                  onChange={e => setForm({...form, status: e.target.value})}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-primary"
                >
                  <option value="paid">Pago / Recebido</option>
                  <option value="pending">Pendente / A Receber</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 h-9 text-sm font-medium rounded-md text-muted-foreground hover:bg-accent">
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="px-4 h-9 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
                  {submitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* KPIs */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="panel panel-accent p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider">Faturamento (Mês)</span>
            <Wallet className="size-4" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-foreground">{brl(receitasPagas)}</p>
        </div>

        <div className="panel panel-accent p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider">A Receber</span>
            <Activity className="size-4" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-primary">{brl(aReceber)}</p>
        </div>

        <div className="panel panel-accent p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider">Despesas Pagas</span>
            <ArrowDownRight className="size-4" />
          </div>
          <p className="text-2xl font-bold tracking-tight text-destructive">{brl(despesasPagas)}</p>
        </div>

        <div className="panel panel-accent p-5 flex flex-col justify-between bg-primary text-primary-foreground border-l-0">
          <div className="flex items-center justify-between text-primary-foreground/80 mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider">Lucro Líquido</span>
            <TrendingUp className="size-4" />
          </div>
          <p className="text-2xl font-bold tracking-tight">{brl(lucro)}</p>
        </div>
      </section>

      {/* Gráficos e Transações */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        
        {/* Gráfico Recharts */}
        <section className="panel p-6 lg:col-span-2 flex flex-col">
          <h2 className="mb-6 text-sm font-semibold tracking-tight text-foreground">Evolução do Fluxo de Caixa (6 meses)</h2>
          <div className="flex-1 min-h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `R$${val/1000}k`} tick={{ fontSize: 12, fill: '#888' }} />
                <RechartsTooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
                  formatter={(value: number) => brl(value)}
                />
                <Bar dataKey="Receitas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Últimos Lançamentos */}
        <aside className="panel p-6 flex flex-col h-full max-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Últimos Lançamentos</h2>
            <button className="text-xs text-primary font-medium hover:underline">Ver todos</button>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
                <div className="size-12 rounded-full bg-accent flex items-center justify-center mb-3 text-muted-foreground">
                  <DollarSign className="size-6" />
                </div>
                <p className="text-sm font-medium text-foreground">Nenhuma transação</p>
                <p className="text-xs text-muted-foreground mt-1">Registre seu primeiro lançamento.</p>
              </div>
            ) : (
              transactions.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background/50">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "size-8 rounded-full flex items-center justify-center shrink-0",
                      t.transaction_type === 'income' ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    )}>
                      {t.transaction_type === 'income' ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.description}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {new Date(t.due_date || t.created_at).toLocaleDateString('pt-BR')} • 
                        <span className={cn(
                          "uppercase text-[9px] font-bold px-1 rounded-sm",
                          t.status === 'paid' ? "text-success" : "text-warning"
                        )}>
                          {t.status === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "text-sm font-semibold whitespace-nowrap pl-3",
                    t.transaction_type === 'income' ? "text-foreground" : "text-destructive"
                  )}>
                    {t.transaction_type === 'income' ? '+' : '-'}{brl(t.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </aside>

      </div>
    </AppShell>
  );
}
