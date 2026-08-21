import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, LayoutGrid, CalendarDays, Users } from 'lucide-react';

export const Route = createFileRoute('/login')({
  component: Login,
});

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
    } else {
      navigate({ to: '/' });
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Esquerda - Branding (45%) - Hidden no Mobile */}
      <div className="hidden w-[45%] flex-col justify-between bg-surface p-12 lg:flex border-r border-border relative overflow-hidden">
        
        {/* Abstract Background Element para dar ar sofisticado */}
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-primary/5 blur-3xl" />
        
        <div className="relative z-10 flex items-center gap-3">
          <img 
            src="/logo-horizontal.png" 
            alt="SG Estética Logo" 
            className="h-12 object-contain" 
          />
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-display font-medium tracking-tight text-foreground text-balance">
            Gestão inteligente para clínicas que querem crescer.
          </h1>
          <p className="text-lg text-muted-foreground text-balance">
            Agenda, clientes, vendas e gestão trabalhando juntos.
          </p>
        </div>

        {/* Elemento de UI fake discreto */}
        <div className="relative z-10 mt-12 rounded-xl border border-border bg-background p-4 shadow-sm opacity-60">
          <div className="flex items-center gap-3 border-b border-border pb-3">
            <div className="size-8 rounded-full bg-muted" />
            <div className="space-y-1">
              <div className="h-2 w-24 rounded bg-muted" />
              <div className="h-2 w-16 rounded bg-muted/50" />
            </div>
          </div>
          <div className="mt-3 flex gap-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-3" /> Agenda</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="size-3" /> Clientes</div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><LayoutGrid className="size-3" /> Painel</div>
          </div>
        </div>
      </div>

      {/* Direita - Formulário (55%) */}
      <div className="flex flex-1 flex-col justify-center px-6 sm:px-12 md:px-24">
        
        {/* Logo visível apenas no mobile */}
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <img 
            src="/logo-icon.png" 
            alt="SG Estética Ícone" 
            className="size-10 rounded-full object-cover shadow-sm ring-1 ring-border shrink-0" 
          />
          <img 
            src="/logo-horizontal.png" 
            alt="SG Estética Logo" 
            className="h-8 object-contain max-w-[160px]" 
          />
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Acessar conta</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Insira suas credenciais para entrar no painel.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                required
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="nome@clinica.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="password">Senha</label>
                <Link to="/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Esqueci minha senha
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            {/* Futuro Login com Google */}
            <button
              type="button"
              disabled
              className="inline-flex h-10 w-full items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors opacity-50 cursor-not-allowed"
              title="Em breve"
            >
              <svg className="mr-2 size-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Entrar com Google
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-2 text-center text-sm text-muted-foreground">
            <Link to="/register" className="hover:text-foreground transition-colors">
              Primeiro acesso
            </Link>
            <Link to="/register" className="hover:text-foreground transition-colors">
              Não possui conta? Criar clínica
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
