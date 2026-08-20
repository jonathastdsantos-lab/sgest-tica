import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { agendaHoje, brl } from "@/lib/clinic-data";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda Semanal | SG Estética" },
      {
        name: "description",
        content: "Agenda semanal por profissional com status de confirmação e valores por procedimento.",
      },
      { property: "og:title", content: "Agenda Semanal | SG Estética" },
      {
        property: "og:description",
        content: "Visualize a ocupação da clínica por dia e por profissional.",
      },
    ],
  }),
  component: Agenda,
});

const dias = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function Agenda() {
  return (
    <AppShell titulo="Agenda Semanal" acao="Novo Agendamento">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-medium tracking-tight">Semana atual</h2>
        <span className="text-xs text-muted-foreground">4 profissionais ativos</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {dias.map((dia, i) => {
          const itens = agendaHoje.slice(0, ((i * 2) % agendaHoje.length) + 1);
          return (
            <div key={dia} className="rounded-2xl bg-surface p-5 ring-1 ring-border">
              <div className="mb-4 flex items-baseline justify-between">
                <h3 className="text-sm font-medium">{dia}</h3>
                <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {itens.length} atend.
                </span>
              </div>
              <div className="space-y-3">
                {itens.map((item) => (
                  <div key={item.id} className="rounded-lg border-l-2 border-primary bg-accent/40 p-3">
                    <span className="text-[10px] font-medium text-primary">
                      {item.inicio} — {item.fim}
                    </span>
                    <p className="mt-0.5 text-xs font-medium">{item.paciente}</p>
                    <p className="text-[10px] text-muted-foreground">{item.procedimento}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {item.profissional} • {brl(item.valor)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
