import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/app-shell';

export const Route = createFileRoute('/_auth/ajuda')({
  head: () => ({
    meta: [
      { title: 'Ajuda | SG Estética' },
      { name: 'description', content: 'Central de ajuda do SG Estética: primeiros passos, agenda, clientes e assistente de IA.' },
      { property: 'og:title', content: 'Ajuda | SG Estética' },
      { property: 'og:description', content: 'Guia rápido para usar o SG Estética na sua clínica.' },
    ],
  }),
  component: Ajuda,
});

const topicos = [
  {
    titulo: 'Primeiros passos',
    texto: 'Cadastre a sua clínica no onboarding, crie as unidades e convide a equipe em Configurações.',
  },
  {
    titulo: 'Agenda',
    texto: 'Crie agendamentos por profissional e acompanhe confirmações. O link público permite que o cliente agende sozinho.',
  },
  {
    titulo: 'Clientes e atendimentos',
    texto: 'Cada cliente possui ficha com histórico, fotos clínicas e anamnese vinculada aos atendimentos.',
  },
  {
    titulo: 'Assistente de IA',
    texto: 'Pergunte sobre a agenda do dia, leads em aberto e oportunidades de retorno diretamente no assistente.',
  },
];

function Ajuda() {
  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <h1 className="text-xl font-medium tracking-tight">Central de Ajuda</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Guia rápido para tirar o máximo do SG Estética.
        </p>

        <div className="mt-8 space-y-4">
          {topicos.map((t) => (
            <div key={t.titulo} className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-sm font-medium">{t.titulo}</h2>
              <p className="mt-1 text-pretty text-sm text-muted-foreground">{t.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
