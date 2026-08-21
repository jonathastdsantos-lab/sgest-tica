import { createFileRoute } from '@tanstack/react-router';
import { Package } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { EmBreve } from './_auth.marketing';

export const Route = createFileRoute('/_auth/estoque')({
  head: () => ({
    meta: [
      { title: 'Estoque | SG Estética' },
      { name: 'description', content: 'Controle de insumos, lotes e validade dos produtos usados nos procedimentos.' },
      { property: 'og:title', content: 'Estoque | SG Estética' },
      { property: 'og:description', content: 'Controle de insumos e lotes da clínica.' },
    ],
  }),
  component: () => (
    <AppShell>
      <EmBreve
        icone={<Package className="size-6 text-primary" />}
        titulo="Estoque"
        descricao="Controle de insumos por lote, alertas de validade e baixa automática a cada atendimento chegam em breve."
      />
    </AppShell>
  ),
});
