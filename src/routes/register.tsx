import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, LayoutGrid, CalendarDays, Users } from 'lucide-react';

export const Route = createFileRoute('/register')({
  component: Register,
});

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });
    
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-8" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Verifique seu e-mail</h1>
          <p className="mt-2 text-muted-foreground text-sm">
            Enviamos um link de confirmação para <strong>{email}</strong>. Por favor, verifique sua caixa de entrada para continuar.
          </p>
          <div className="mt-8">
            <Link to="/login" className="text-sm font-medium hover:underline text-foreground transition-colors">
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Esquerda - Branding (45%) - Hidden no Mobile */}
      <div className="hidden w-[45%] flex-col justify-between bg-surface p-12 lg:flex border-r border-border relative overflow-hidden">
        
        {/* Abstract Background Element para dar ar sofisticado */}
        <div className="absolute -bottom-24 -right-24 size-96 rounded-full bg-primary/5 blur-3xl" />
        
        <div className="relative z-10 flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded bg-primary text-primary-foreground">
            <span className="text-xs font-bold">SG</span>
          </div>
          <span className="text-lg font-medium tracking-tight">SGEstética</span>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-display font-medium tracking-tight text-foreground text-balance">
            Dê o próximo passo na sua clínica.
          </h1>
          <p className="text-lg text-muted-foreground text-balance">
            Crie sua conta agora e organize sua agenda, pacientes e funil de vendas em um só lugar.
          </p>
        </div>

        <div className="relative z-10 text-sm text-muted-foreground">
          © {new Date().getFullYear()} SGEstética. Todos os direitos reservados.
        </div>
      </div>

      {/* Direita - Formulário (55%) */}
      <div className="flex flex-1 flex-col justify-center px-6 sm:px-12 md:px-24">
        
        {/* Logo visível apenas no mobile */}
        <div className="mb-12 flex items-center gap-2 lg:hidden">
          <div className="flex size-8 items-center justify-center rounded bg-primary text-primary-foreground">
            <span className="text-xs font-bold">SG</span>
          </div>
          <span className="text-lg font-medium tracking-tight">SGEstética</span>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Criar conta</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Preencha seus dados para iniciar seu período gratuito.
          </p>

          <form onSubmit={handleRegister} className="mt-8 space-y-5">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="fullName">Nome Completo</label>
              <input
                id="fullName"
                type="text"
                required
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Dr. João Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

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
              <label className="text-sm font-medium" htmlFor="password">Senha</label>
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
              {loading ? 'Criando conta...' : 'Criar conta livremente'}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-2 text-center text-sm text-muted-foreground">
            <Link to="/login" className="hover:text-foreground transition-colors">
              Já tem uma conta? Entre aqui
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
