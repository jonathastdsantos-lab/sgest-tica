import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { brl, faturamentoMensal, receitaPorProcedimento } from "@/lib/clinic-data";

export const Route = createFileRoute("/_auth/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro | SG Estética" },
      {
        name: "description",
        content: "Faturamento, ticket médio e receita por procedimento da clínica em um só lugar.",
      },
      { property: "og:title", content: "Financeiro | SG Estética" },
      {
        property: "og:description",
        content: "Acompanhe a evolução do faturamento e a receita por categoria de procedimento.",
      },
    ],
  }),
  component: Financeiro,
});

function Financeiro() {
  const maiorMes = Math.max(...faturamentoMensal.map((m) => m.valor));
  const totalCategoria = receitaPorProcedimento.reduce((s, r) => s + r.valor, 0);

  return (
    <AppShell titulo="Financeiro" acao="Novo Lançamento">
      <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {[
          { rotulo: "Faturamento do mês", valor: brl(42850) },
          { rotulo: "Ticket médio", valor: brl(1180) },
          { rotulo: "A receber (30 dias)", valor: brl(9740) },
        ].map((k) => (
          <div key={k.rotulo} className="rounded-2xl bg-surface p-6 ring-1 ring-border">
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              {k.rotulo}
            </span>
            <p className="mt-2 text-2xl font-medium tracking-tight">{k.valor}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="rounded-2xl bg-surface p-6 ring-1 ring-border lg:col-span-2">
          <h2 className="mb-6 text-sm font-medium">Evolução do faturamento</h2>
          <div className="flex h-56 items-end gap-4">
            {faturamentoMensal.map((m) => (
              <div key={m.mes} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{(m.valor / 1000).toFixed(1)}k</span>
                <div
                  className="w-full rounded-t-md bg-primary/80"
                  style={{ height: `${(m.valor / maiorMes) * 100}%` }}
                />
                <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{m.mes}</span>
              </div>
            ))}
          </div>
        </section>

        <aside className="rounded-2xl bg-surface p-6 ring-1 ring-border">
          <h2 className="mb-6 text-sm font-medium">Receita por procedimento</h2>
          <div className="space-y-5">
            {receitaPorProcedimento.map((r) => (
              <div key={r.nome}>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium">{r.nome}</span>
                  <span className="text-[10px] text-muted-foreground">{brl(r.valor)}</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(r.valor / totalCategoria) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
