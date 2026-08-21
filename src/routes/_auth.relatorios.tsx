import { createFileRoute } from '@tanstack/react-router';
import { BarChart3 } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { EmBreve } from './_auth.marketing';

export const Route = createFileRoute('/_auth/relatorios')({
  head: () => ({
    meta: [
      { title: 'Relatórios | SG Estética' },
      { name: 'description', content: 'Relatórios gerenciais de faturamento, retenção e desempenho por profissional.' },
      { property: 'og:title', content: 'Relatórios | SG Estética' },
      { property: 'og:description', content: 'Indicadores gerenciais da clínica em um só lugar.' },
    ],
  }),
  component: () => (
    <AppShell>
      <EmBreve
        icone={<BarChart3 className="size-6 text-primary" />}
        titulo="Relatórios"
        descricao="Relatórios de faturamento, retenção, desempenho por profissional e exportação em PDF chegam em breve."
      />
    </AppShell>
  ),
});
