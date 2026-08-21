import { createFileRoute } from '@tanstack/react-router';
import { Megaphone } from 'lucide-react';
import { AppShell } from '@/components/app-shell';

export const Route = createFileRoute('/_auth/marketing')({
  head: () => ({
    meta: [
      { title: 'Marketing | SG Estética' },
      { name: 'description', content: 'Campanhas, automações de reativação e jornadas de relacionamento da clínica.' },
      { property: 'og:title', content: 'Marketing | SG Estética' },
      { property: 'og:description', content: 'Campanhas e automações inteligentes para clínicas de estética.' },
    ],
  }),
  component: () => (
    <AppShell>
      <EmBreve
        icone={<Megaphone className="size-6 text-primary" />}
        titulo="Marketing"
        descricao="Campanhas de reativação, jornadas por WhatsApp e disparos segmentados por procedimento chegam em breve."
      />
    </AppShell>
  ),
});

export function EmBreve({
  icone,
  titulo,
  descricao,
}: {
  icone: React.ReactNode;
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">{icone}</div>
      <h1 className="text-xl font-medium tracking-tight">{titulo}</h1>
      <p className="mt-2 text-pretty text-sm text-muted-foreground">{descricao}</p>
      <span className="mt-6 rounded-full border border-border px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Em breve
      </span>
    </div>
  );
}
