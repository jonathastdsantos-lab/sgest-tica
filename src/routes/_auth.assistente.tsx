import { createFileRoute } from '@tanstack/react-router';
import { useTenant } from '@/hooks/use-tenant';
import { Sparkles, Send, Bot, User as UserIcon } from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/_auth/assistente')({
  component: Assistant,
});

function Assistant() {
  const { tenant } = useTenant();
  const firstName = tenant?.responsavel?.split(' ')[0] || 'Doutor(a)';
  
  const [query, setQuery] = useState('');

  const suggestions = [
    "Como está meu faturamento?",
    "Quem precisa de retorno?",
    "Quais horários estão disponíveis amanhã?",
    "Encontre oportunidades de venda",
  ];

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col bg-surface rounded-xl border border-border shadow-sm overflow-hidden animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border p-4 bg-primary/5">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Sparkles className="size-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-primary">SGEstética AI</h2>
          <p className="text-xs text-muted-foreground">Seu assistente inteligente de gestão</p>
        </div>
      </div>

      {/* Chat Area (Empty State / Greeting) */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center text-center space-y-6">
        <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
          <Bot className="size-8" />
        </div>
        
        <div className="space-y-2 max-w-md">
          <h1 className="text-2xl font-display font-medium tracking-tight">
            Olá, {firstName}.
          </h1>
          <p className="text-muted-foreground">
            Como posso ajudar sua clínica hoje? Estou integrado à sua agenda, clientes e fluxo de caixa.
          </p>
        </div>

        {/* Suggestions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mt-4">
          {suggestions.map((suggestion, i) => (
            <button
              key={i}
              onClick={() => setQuery(suggestion)}
              className="text-left px-4 py-3 rounded-lg border border-border bg-background hover:bg-accent hover:border-primary/30 transition-all group"
            >
              <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                {suggestion}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border bg-background/50">
        <form 
          className="relative max-w-3xl mx-auto flex items-end gap-2"
          onSubmit={(e) => { e.preventDefault(); /* Mock handler */ setQuery(''); }}
        >
          <div className="relative flex-1">
            <textarea
              rows={1}
              placeholder="Pergunte qualquer coisa sobre sua clínica..."
              className="min-h-[52px] w-full resize-none rounded-2xl border border-input bg-surface pl-4 pr-12 pt-3.5 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  // Submit logic
                  setQuery('');
                }
              }}
            />
            <button
              type="submit"
              disabled={!query.trim()}
              className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 disabled:hover:bg-primary"
            >
              <Send className="size-4 ml-0.5" />
            </button>
          </div>
        </form>
        <div className="text-center mt-3">
          <span className="text-[10px] text-muted-foreground">
            A IA pode cometer erros. Considere verificar informações críticas no painel.
          </span>
        </div>
      </div>

    </div>
  );
}
