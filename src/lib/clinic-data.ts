// Dados de demonstração da clínica ativa (tenant atual).
// Estrutura já modelada por tenant para a futura camada multi-tenant.

export type Tenant = {
  id: string;
  nome: string;
  unidade: string;
  cidade: string;
  responsavel: string;
};

export const tenants: Tenant[] = [
  {
    id: "jardins",
    nome: "Clínica Bella Derme",
    unidade: "Unidade Jardins",
    cidade: "São Paulo",
    responsavel: "Dra. Beatriz Santos",
  },
  {
    id: "moema",
    nome: "Clínica Bella Derme",
    unidade: "Unidade Moema",
    cidade: "São Paulo",
    responsavel: "Dr. André Furtado",
  },
  {
    id: "bh",
    nome: "Clínica Bella Derme",
    unidade: "Unidade Savassi",
    cidade: "Belo Horizonte",
    responsavel: "Dra. Lívia Prado",
  },
];

export type Agendamento = {
  id: string;
  inicio: string;
  fim: string;
  paciente: string;
  procedimento: string;
  profissional: string;
  valor: number;
  status: "confirmado" | "espera" | "cancelado";
};

export const agendaHoje: Agendamento[] = [
  {
    id: "a1",
    inicio: "09:00",
    fim: "10:30",
    paciente: "Mariana Silveira",
    procedimento: "Preenchimento Labial e Botox (Testa)",
    profissional: "Dra. Beatriz Santos",
    valor: 2450,
    status: "confirmado",
  },
  {
    id: "a2",
    inicio: "11:00",
    fim: "12:00",
    paciente: "Ricardo Mendes",
    procedimento: "Limpeza de Pele Profunda",
    profissional: "Est. Paula Rocha",
    valor: 320,
    status: "espera",
  },
  {
    id: "a3",
    inicio: "14:30",
    fim: "15:30",
    paciente: "Ana Paula Duarte",
    procedimento: "Bioestimulador de Colágeno",
    profissional: "Dra. Beatriz Santos",
    valor: 1800,
    status: "confirmado",
  },
  {
    id: "a4",
    inicio: "16:00",
    fim: "17:00",
    paciente: "Camila Nunes",
    procedimento: "Peeling de Diamante",
    profissional: "Est. Paula Rocha",
    valor: 480,
    status: "confirmado",
  },
];

export type Paciente = {
  id: string;
  nome: string;
  telefone: string;
  ultimoProcedimento: string;
  ultimaVisita: string;
  totalGasto: number;
  risco: "baixo" | "medio" | "alto";
};

export const pacientes: Paciente[] = [
  {
    id: "p1",
    nome: "Mariana Silveira",
    telefone: "(11) 98812-4410",
    ultimoProcedimento: "Preenchimento Labial",
    ultimaVisita: "Hoje",
    totalGasto: 12400,
    risco: "baixo",
  },
  {
    id: "p2",
    nome: "Júlia Kirchner",
    telefone: "(11) 99120-7788",
    ultimoProcedimento: "Bioestimulador de Colágeno",
    ultimaVisita: "Há 45 min",
    totalGasto: 8600,
    risco: "baixo",
  },
  {
    id: "p3",
    nome: "Ricardo Mendes",
    telefone: "(11) 97744-2093",
    ultimoProcedimento: "Limpeza de Pele Profunda",
    ultimaVisita: "Há 3 meses",
    totalGasto: 1920,
    risco: "alto",
  },
  {
    id: "p4",
    nome: "Carla Tavares",
    telefone: "(11) 98333-1120",
    ultimoProcedimento: "Drenagem Linfática",
    ultimaVisita: "Há 4 horas",
    totalGasto: 3450,
    risco: "medio",
  },
  {
    id: "p5",
    nome: "Felipe Almeida",
    telefone: "(11) 99871-0034",
    ultimoProcedimento: "Avaliação Facial",
    ultimaVisita: "Há 2 horas",
    totalGasto: 250,
    risco: "medio",
  },
  {
    id: "p6",
    nome: "Ana Paula Duarte",
    telefone: "(11) 98110-5567",
    ultimoProcedimento: "Botox Full Face",
    ultimaVisita: "Há 6 meses",
    totalGasto: 15900,
    risco: "alto",
  },
];

export const historicoRecente = [
  { id: "h1", descricao: "Júlia K. (Bioestimulador)", detalhe: "Concluído há 45 min", valor: 1800 },
  { id: "h2", descricao: "Felipe A. (Avaliação)", detalhe: "Concluído há 2 horas", valor: 250 },
  { id: "h3", descricao: "Carla T. (Drenagem)", detalhe: "Concluído há 4 horas", valor: 180 },
];

export const faturamentoMensal = [
  { mes: "Abr", valor: 31200 },
  { mes: "Mai", valor: 33800 },
  { mes: "Jun", valor: 36100 },
  { mes: "Jul", valor: 38120 },
  { mes: "Ago", valor: 40450 },
  { mes: "Set", valor: 42850 },
];

export const receitaPorProcedimento = [
  { nome: "Botox e Toxina", valor: 15400 },
  { nome: "Preenchimentos", valor: 11800 },
  { nome: "Bioestimuladores", valor: 8300 },
  { nome: "Limpeza e Peeling", valor: 4600 },
  { nome: "Corporal", valor: 2750 },
];

export function brl(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}
