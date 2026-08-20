import { createFileRoute, Outlet, redirect, useNavigate } from '@tanstack/react-router';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { useTenant } from '@/hooks/use-tenant';

export const Route = createFileRoute('/_auth')({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
        },
      });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  const { organizations, isLoading } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && organizations.length === 0) {
      // Se não estiver carregando e não tiver nenhuma organização,
      // força o redirecionamento para o onboarding.
      // E evita loop caso já esteja no onboarding.
      if (window.location.pathname !== '/onboarding') {
        navigate({ to: '/_auth/onboarding' });
      }
    } else if (!isLoading && organizations.length > 0) {
      // Se tiver organização e estiver na tela de onboarding, manda para a home
      if (window.location.pathname === '/onboarding') {
        navigate({ to: '/_auth/' });
      }
    }
  }, [organizations, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background">
      <Outlet />
    </div>
  );
}
