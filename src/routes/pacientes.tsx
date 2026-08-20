import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { brl, pacientes } from "@/lib/clinic-data";

export const Route = createFileRoute("/pacientes")({
  head: () => ({
    meta: [
      { title: "Pacientes | SG Estética" },
      {
        name: "description",
        content: "Base de pacientes da clínica com histórico de procedimentos, ticket total e risco de evasão.",
      },
      { property: "og:title", content: "Pacientes | SG Estética" },
      {
        property: "og:description",
        content: "Fichas de pacientes com histórico e sinalização inteligente de retorno.",
      },
    ],
  }),
  component: Pacientes,
});

const rotuloRisco = { baixo: "Ativo", medio: "Atenção", alto: "Risco de evasão" } as const;

function Pacientes() {
  const [busca, setBusca] = useState("");
  const lista = pacientes.filter((p) => p.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <AppShell titulo="Pacientes" acao="Novo Paciente">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar paciente..."
          className="w-full rounded-md bg-surface px-3 py-2 text-sm ring-1 ring-border outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring sm:max-w-xs"
        />
        <span className="text-xs text-muted-foreground">{lista.length} pacientes</span>
      </div>

      <div className="overflow-hidden rounded-2xl bg-surface ring-1 ring-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              <th className="px-5 py-3 font-medium">Paciente</th>
              <th className="hidden px-5 py-3 font-medium md:table-cell">Último procedimento</th>
              <th className="hidden px-5 py-3 font-medium sm:table-cell">Última visita</th>
              <th className="px-5 py-3 font-medium">Total</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-accent/30">
                <td className="px-5 py-4">
                  <p className="font-medium">{p.nome}</p>
                  <p className="text-[10px] text-muted-foreground">{p.telefone}</p>
                </td>
                <td className="hidden px-5 py-4 text-xs text-muted-foreground md:table-cell">
                  {p.ultimoProcedimento}
                </td>
                <td className="hidden px-5 py-4 text-xs text-muted-foreground sm:table-cell">
                  {p.ultimaVisita}
                </td>
                <td className="px-5 py-4 text-xs font-medium">{brl(p.totalGasto)}</td>
                <td className="px-5 py-4">
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-border " +
                      (p.risco === "alto"
                        ? "bg-secondary text-destructive"
                        : p.risco === "medio"
                          ? "bg-secondary text-muted-foreground"
                          : "bg-success-muted text-success")
                    }
                  >
                    {rotuloRisco[p.risco]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
