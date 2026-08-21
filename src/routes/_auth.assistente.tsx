import { createFileRoute } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { supabase } from '@/lib/supabase';
import { Sparkles, Send, Bot, User as UserIcon, KeyRound, Settings, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const Route = createFileRoute('/_auth/assistente')({
  component: Assistant,
});

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

function Assistant() {
  const { tenant, currentUnit } = useTenant();
  const firstName = tenant?.name?.split(' ')[0] || 'Doutor(a)';
  
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('sg_openai_key');
    if (savedKey) {
      setApiKey(savedKey);
      setHasKey(true);
    } else {
      setShowConfig(true);
    }
  }, []);

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim().startsWith('sk-')) {
      toast.error('Chave de API inválida. Deve começar com "sk-".');
      return;
    }
    localStorage.setItem('sg_openai_key', apiKey.trim());
    setHasKey(true);
    setShowConfig(false);
    toast.success('Chave de IA configurada com sucesso!');
  };

  const removeKey = () => {
    localStorage.removeItem('sg_openai_key');
    setApiKey('');
    setHasKey(false);
    setShowConfig(true);
  };

  const buildContextPrompt = async () => {
    if (!tenant) return '';
    
    // Buscar contexto real
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(); endOfDay.setHours(23,59,59,999);
    
    // 1. Agendamentos de hoje
    let aptQuery = supabase.from('appointments').select('start_at, status, clients(full_name), procedures(name, price)')
      .eq('organization_id', tenant.id).gte('start_at', startOfDay.toISOString()).lte('start_at', endOfDay.toISOString());
    if (currentUnit) aptQuery = aptQuery.eq('unit_id', currentUnit.id);
    const { data: apts } = await aptQuery;
    
    // 2. Leads Abertos
    let leadsQuery = supabase.from('leads').select('name, interest, status').eq('organization_id', tenant.id).eq('status', 'open');
    if (currentUnit) leadsQuery = leadsQuery.eq('unit_id', currentUnit.id);
    const { data: leads } = await leadsQuery;
    
    let ctx = `Você é o "SGEstética AI", um assistente executivo e estratégico super inteligente da clínica "${tenant.name}".
    O usuário atual é o(a) ${firstName}. Trate-o de forma polida, premium e vá direto ao ponto.
    Não responda perguntas que fujam muito do contexto de gestão clínica, marketing ou finanças médicas.
    
    DADOS ATUAIS DA CLÍNICA NESTE MOMENTO:
    Data de Hoje: ${new Date().toLocaleDateString('pt-BR')}
    
    AGENDA DE HOJE:
    `;
    
    if (apts && apts.length > 0) {
      const faturamentoEsperado = apts.reduce((acc, a) => acc + ((a.procedures as any)?.price || 0), 0);
      ctx += `Total de pacientes hoje: ${apts.length}. Receita prevista do dia: R$ ${faturamentoEsperado}.\n`;
      apts.forEach(a => {
        const time = new Date(a.start_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
        ctx += `- ${time} | ${(a.clients as any)?.full_name} | Procedimento: ${(a.procedures as any)?.name} | Status: ${a.status}\n`;
      });
    } else {
      ctx += `Nenhum agendamento para hoje.\n`;
    }
    
    ctx += `\nLEADS EM ABERTO NO CRM (Oportunidades de Venda):\n`;
    if (leads && leads.length > 0) {
      ctx += `Temos ${leads.length} leads aguardando contato.\n`;
      leads.slice(0, 10).forEach(l => {
        ctx += `- Nome: ${l.name} | Interesse: ${l.interest}\n`;
      });
    } else {
      ctx += `Nenhum lead aberto no momento.\n`;
    }
    
    return ctx;
  };

  const handleSubmit = async (e?: React.FormEvent, predefinedQuery?: string) => {
    if (e) e.preventDefault();
    const textToSend = predefinedQuery || query;
    if (!textToSend.trim() || !hasKey || isLoading) return;

    const userMessage: Message = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      // 1. Gather Context
      const systemContext = await buildContextPrompt();
      const systemMessage: Message = { role: 'system', content: systemContext };

      // 2. Prepare payload
      // We only send the last 10 messages to save tokens + the injected system context
      const apiMessages = [systemMessage, ...messages.slice(-10), userMessage];

      // 3. Call OpenAI API directly (V1 BYOK architecture)
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Fast and cheap model
          messages: apiMessages.map(m => ({ role: m.role, content: m.content })),
          temperature: 0.7,
          max_tokens: 500,
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Erro na API da OpenAI');
      }

      const data = await response.json();
      const assistantReply = data.choices[0].message.content;

      setMessages(prev => [...prev, { role: 'assistant', content: assistantReply }]);

    } catch (error: any) {
      toast.error(error.message || "Falha de conexão com a IA.");
      if (error.message.includes('key')) {
        setHasKey(false);
        setShowConfig(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const suggestions = [
    "Como está minha agenda hoje?",
    "Resumo do CRM: Temos leads abertos?",
    "Gere uma mensagem de WhatsApp para atrair clientes sumidos.",
    "O que eu posso fazer para melhorar meu faturamento hoje?",
  ];

  return (
    <div className="panel flex h-[calc(100vh-8rem)] flex-col overflow-hidden animate-in fade-in duration-500 relative">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4 bg-accent/30 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-accent text-primary shrink-0">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-primary">SGEstética AI</h2>
            <p className="text-xs text-muted-foreground">O cérebro da sua clínica</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowConfig(!showConfig)}
          className="p-2 text-muted-foreground hover:bg-accent rounded-full transition-colors"
          title="Configurações da IA"
        >
          <Settings className="size-5" />
        </button>
      </div>

      {/* Config Panel (BYOK) */}
      {showConfig && (
        <div className="absolute inset-x-0 top-[73px] bg-surface border-b border-border p-6 shadow-md z-20 animate-in slide-in-from-top-2">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <KeyRound className="size-4" /> Configuração da API OpenAI
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            Para garantir a privacidade dos dados da sua clínica na V1, o processamento de IA roda direto no seu navegador. Insira sua chave (Secret Key) da OpenAI. Ela será salva de forma segura apenas no seu navegador local (`localStorage`).
          </p>
          <form onSubmit={handleSaveKey} className="flex gap-2">
            <input 
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm focus:ring-1 focus:ring-primary"
            />
            <button type="submit" className="h-9 px-4 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90">
              Salvar Chave
            </button>
            {hasKey && (
              <button type="button" onClick={removeKey} className="h-9 px-4 bg-destructive text-destructive-foreground text-sm font-medium rounded-md hover:bg-destructive/90">
                Remover
              </button>
            )}
          </form>
        </div>
      )}

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col space-y-6"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-full">
            <div className="size-14 rounded-full bg-accent flex items-center justify-center text-primary mb-4 font-semibold">
              <Bot className="size-7" />
            </div>
            <h1 className="text-2xl font-display font-medium tracking-tight mb-2 text-foreground">
              Olá, {firstName}.
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mb-8">
              A inteligência artificial tem acesso direto aos dados da sua clínica. 
              Experimente me perguntar sobre a agenda ou sobre os leads.
            </p>

            {/* Suggestions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSubmit(undefined, suggestion)}
                  className="text-left p-4 panel hover:border-primary/40 transition-all group shadow-xs"
                >
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {suggestion}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6 max-w-3xl mx-auto w-full pb-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-4", m.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                <div className={cn(
                  "flex size-8 shrink-0 select-none items-center justify-center rounded-md border shadow",
                  m.role === 'user' ? "bg-background border-border" : "bg-primary text-primary-foreground"
                )}>
                  {m.role === 'user' ? <UserIcon className="size-4" /> : <Bot className="size-4" />}
                </div>
                <div className={cn(
                  "flex-1 px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                  m.role === 'user' ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-surface border border-border rounded-tl-sm text-foreground"
                )}>
                  {m.content}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-primary text-primary-foreground shadow">
                  <Bot className="size-4" />
                </div>
                <div className="flex items-center gap-2 px-4 py-3 bg-surface border border-border rounded-2xl rounded-tl-sm shadow-sm text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Pensando, cruzando dados da clínica...
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background/50 shrink-0 relative z-10">
        {!hasKey && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
            <span className="text-sm font-medium">Configure a API Key no topo para liberar o chat.</span>
          </div>
        )}
        <form 
          className="relative max-w-3xl mx-auto flex items-end gap-2"
          onSubmit={handleSubmit}
        >
          <div className="relative flex-1">
            <textarea
              rows={1}
              disabled={!hasKey || isLoading}
              placeholder="Ex: Qual o faturamento previsto de hoje?"
              className="min-h-[52px] w-full resize-none rounded-2xl border border-input bg-surface pl-4 pr-12 pt-3.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!query.trim() || !hasKey || isLoading}
              className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary"
            >
              {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4 ml-0.5" />}
            </button>
          </div>
        </form>
        <div className="text-center mt-3">
          <span className="text-[10px] text-muted-foreground">
            A IA da OpenAI tem acesso restrito a resumos numéricos (Agendamentos e CRM) durante o processamento desta requisição.
          </span>
        </div>
      </div>

    </div>
  );
}
