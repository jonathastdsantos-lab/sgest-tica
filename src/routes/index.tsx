import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { agendaHoje, brl, historicoRecente } from "@/lib/clinic-data";
import { useTenant } from "@/lib/tenant";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel de Gestão | SG Estética" },
      {
        name: "description",
        content:
          "Painel da clínica com faturamento, ocupação, agenda do dia e automações inteligentes da SG Estética.",
      },
      { property: "og:title", content: "Painel de Gestão | SG Estética" },
      {
        property: "og:description",
        content: "Gestão completa de clínicas de estética com agenda, pacientes e IA.",
      },
    ],
  }),
  component: Painel,
});

const kpis = [
  {
    rotulo: "Faturamento Mensal",
    valor: "R$ 42.850,00",
    delta: "+12.4%",
    positivo: true,
    nota: "Comparado ao mesmo período do mês anterior.",
  },
  {
    rotulo: "Ocupação de Sala",
    valor: "86%",
    delta: "Normal",
    positivo: false,
    nota: "Média de 7.5 procedimentos por dia por sala.",
  },
  {
    rotulo: "Taxa de No-Show",
    valor: "4.2%",
    delta: "-2.1%",
    positivo: true,
    nota: "Queda atribuída aos lembretes automáticos via IA.",
  },
];

function Painel() {
  const { tenant } = useTenant();

  return (
    <AppShell titulo="Painel de Gestão">
      <section className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.rotulo} className="rounded-2xl bg-surface p-6 ring-1 ring-border">
            <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
              {kpi.rotulo}
            </span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-medium tracking-tight">{kpi.valor}</span>
              <span className={kpi.positivo ? "text-xs text-success" : "text-xs text-muted-foreground"}>
                {kpi.delta}
              </span>
            </div>
            <p className="mt-1 max-w-[48ch] text-pretty text-xs text-muted-foreground">{kpi.nota}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="space-y-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium tracking-tight">Agenda de Hoje</h2>
            <span className="text-xs text-muted-foreground">{tenant.unidade}</span>
          </div>

          <div className="relative space-y-8 border-l border-border pl-8">
            {agendaHoje.map((item) => {
              const confirmado = item.status === "confirmado";
              return (
                <div key={item.id} className="relative">
                  <div
                    className={
                      "absolute -left-[37px] top-1 size-4 rounded-full bg-background ring-4 ring-background " +
                      (confirmado ? "border border-primary" : "border border-input")
                    }
                  />
                  <div
                    className={
                      "flex flex-col justify-between rounded-xl bg-surface p-5 ring-1 ring-border sm:flex-row sm:items-center " +
                      (confirmado ? "" : "opacity-60")
                    }
                  >
                    <div>
                      <span
                        className={
                          "text-xs font-medium " + (confirmado ? "text-primary" : "text-muted-foreground")
                        }
                      >
                        {item.inicio} — {item.fim}
                      </span>
                      <h3 className="mt-1 text-sm font-medium">{item.paciente}</h3>
                      <p className="text-xs text-muted-foreground">{item.procedimento}</p>
                    </div>
                    <div className="mt-4 flex items-center gap-3 sm:mt-0">
                      <span className="text-xs font-medium">{brl(item.valor)}</span>
                      <span
                        className={
                          confirmado
                            ? "rounded-full bg-success-muted px-2 py-0.5 text-[10px] font-medium text-success ring-1 ring-border"
                            : "rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground ring-1 ring-border"
                        }
                      >
                        {confirmado ? "Confirmado" : "Em Espera"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl bg-ink p-6 text-ink-foreground">
            <div className="mb-4 flex items-center gap-2">
              <div className="size-2 animate-pulse rounded-full bg-success" />
              <h2 className="text-sm font-medium">Assistente Inteligente</h2>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-pretty text-xs leading-relaxed opacity-80">
                  Detectamos 3 pacientes com alta probabilidade de no-show para amanhã.
                </p>
                <button className="mt-3 w-full rounded bg-surface py-2 text-xs font-medium text-surface-foreground transition-opacity hover:opacity-90">
                  Enviar Lembretes WhatsApp
                </button>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-pretty text-xs leading-relaxed opacity-80">
                  Sugestão: abertura de horário para {tenant.responsavel} às 16h devido a cancelamento.
                </p>
                <button className="mt-3 w-full rounded bg-primary py-2 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90">
                  Notificar Lista de Espera
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-surface p-6 ring-1 ring-border">
            <h2 className="mb-4 text-sm font-medium">Histórico Recente</h2>
            <div className="space-y-4">
              {historicoRecente.map((h) => (
                <div key={h.id} className="flex items-start gap-3">
                  <div className="mt-1.5 size-2 shrink-0 rounded-full bg-input" />
                  <div>
                    <p className="text-xs font-medium">{h.descricao}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {h.detalhe} • {brl(h.valor)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
