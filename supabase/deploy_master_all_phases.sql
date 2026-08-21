-- SGEstética - Master Script de Migração Consolidado
-- Execute este script no SQL Editor do Supabase. Ele é 100% idempotente e seguro para re-execução.

-------------------------------------------------------------------------------
-- 1. FASE 4: Prontuários e Fotos Clínicas
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    
    record_type TEXT DEFAULT 'evolution',
    content TEXT,
    anamnesis_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinical_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    record_id UUID REFERENCES public.medical_records(id) ON DELETE CASCADE,
    
    photo_url TEXT NOT NULL,
    photo_type TEXT DEFAULT 'before',
    body_part TEXT,
    notes TEXT,
    
    date_taken TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Consentimento de Uso de Imagem
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS photo_consent BOOLEAN DEFAULT false;

-------------------------------------------------------------------------------
-- 2. FASE 5: Gestão Financeira
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'overdue')),
    
    due_date DATE,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-------------------------------------------------------------------------------
-- 3. BLOCO 2: Pacotes de Sessões
-------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL,
    total_sessions INT NOT NULL,
    price_paid NUMERIC DEFAULT 0,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.package_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-------------------------------------------------------------------------------
-- 4. BLOCO 3: Slug da Organização & Agendamento Público
-------------------------------------------------------------------------------

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Atualizar slugs garantindo unicidade com sufixo do ID para evitar colisão
UPDATE public.organizations 
SET slug = COALESCE(NULLIF(LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')), ''), 'clinica') || '-' || SUBSTRING(id::text, 1, 6)
WHERE slug IS NULL;

-------------------------------------------------------------------------------
-- 5. SEGURANÇA E RLS (ROW LEVEL SECURITY)
-------------------------------------------------------------------------------

ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_sessions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    table_name text;
    tables text[] := ARRAY['medical_records', 'clinical_photos', 'financial_transactions', 'packages'];
BEGIN
    FOREACH table_name IN ARRAY tables LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS "Users can access data of their organizations" ON public.%I;
            CREATE POLICY "Users can access data of their organizations" 
            ON public.%I FOR ALL 
            USING (public.user_has_org_access(organization_id));
        ', table_name, table_name);
    END LOOP;
END;
$$;

-- Permissões adicionais para Pacotes
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can access package_sessions of their org" ON public.package_sessions;
    CREATE POLICY "Users can access package_sessions of their org" 
    ON public.package_sessions FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.packages p WHERE p.id = package_sessions.package_id AND public.user_has_org_access(p.organization_id)));

    -- Acesso Público (anon) para Agendamento Online
    DROP POLICY IF EXISTS "Public can view organization by slug" ON public.organizations;
    CREATE POLICY "Public can view organization by slug" ON public.organizations FOR SELECT TO anon, authenticated USING (true);

    DROP POLICY IF EXISTS "Public can check appointment slots" ON public.appointments;
    CREATE POLICY "Public can check appointment slots" ON public.appointments FOR SELECT TO anon USING (true);

    DROP POLICY IF EXISTS "Public can insert pending_confirmation appointment" ON public.appointments;
    CREATE POLICY "Public can insert pending_confirmation appointment" ON public.appointments FOR INSERT TO anon WITH CHECK (status = 'pending_confirmation');

    DROP POLICY IF EXISTS "Public can insert client for booking" ON public.clients;
    CREATE POLICY "Public can insert client for booking" ON public.clients FOR INSERT TO anon WITH CHECK (true);
END;
$$;
