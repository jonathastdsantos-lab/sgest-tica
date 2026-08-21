-- Migration para Bloco 3: Agendamento Online Público

-- 1. Adicionar slug único em organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Atualizar slugs para organizações existentes que estejam nulas
UPDATE public.organizations 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g'))
WHERE slug IS NULL;

-- 2. Permissões de RLS para acesso público (anon) no agendamento online

-- Permitir SELECT público em organizações por slug
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public can view organization by slug" ON public.organizations;
    CREATE POLICY "Public can view organization by slug"
    ON public.organizations FOR SELECT
    TO anon, authenticated
    USING (true);

    DROP POLICY IF EXISTS "Public can view active procedures" ON public.procedures;
    CREATE POLICY "Public can view active procedures"
    ON public.procedures FOR SELECT
    TO anon, authenticated
    USING (active = true OR active IS NULL);

    DROP POLICY IF EXISTS "Public can view professionals" ON public.professionals;
    CREATE POLICY "Public can view professionals"
    ON public.professionals FOR SELECT
    TO anon, authenticated
    USING (status = 'active' OR status IS NULL);

    DROP POLICY IF EXISTS "Public can insert client for booking" ON public.clients;
    CREATE POLICY "Public can insert client for booking"
    ON public.clients FOR INSERT
    TO anon
    WITH CHECK (true);

    DROP POLICY IF EXISTS "Public can check appointment slots" ON public.appointments;
    CREATE POLICY "Public can check appointment slots"
    ON public.appointments FOR SELECT
    TO anon
    USING (true);

    DROP POLICY IF EXISTS "Public can insert pending_confirmation appointment" ON public.appointments;
    CREATE POLICY "Public can insert pending_confirmation appointment"
    ON public.appointments FOR INSERT
    TO anon
    WITH CHECK (status = 'pending_confirmation');
END;
$$;
