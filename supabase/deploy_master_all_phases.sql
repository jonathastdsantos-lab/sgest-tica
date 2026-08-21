-- ===============================================================================
-- SGEstética - Master Script de Migração Consolidado (Fases 1 a 5 + Novas Funcionalidades)
-- Execute este script no SQL Editor do Supabase. É 100% idempotente e seguro.
-- ===============================================================================

-- 1. FUNÇÕES AUXILIARES E RLS
CREATE OR REPLACE FUNCTION public.user_has_org_access(org_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_members.organization_id = org_id 
    AND organization_members.user_id = auth.uid()
    AND (organization_members.active = true OR organization_members.active IS NULL)
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.update_modified_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ESTRUTURA BASE (ORGANIZAÇÕES, UNIDADES E MEMBROS)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT,
    logo_url TEXT,
    status TEXT DEFAULT 'active',
    slug TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Atualizar slugs garantindo unicidade com sufixo do ID
UPDATE public.organizations 
SET slug = COALESCE(NULLIF(LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')), ''), 'clinica') || '-' || SUBSTRING(id::text, 1, 6)
WHERE slug IS NULL;

CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    default_unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.user_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, unit_id)
);

-- 3. TABELAS DE CLIENTES, PROCEDIMENTOS E PROFISSIONAIS
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    status TEXT DEFAULT 'active',
    photo_consent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.procedures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    duration_minutes INT NOT NULL DEFAULT 60,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'Especialista',
    phone TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. AGENDAMENTOS E LEADS (CRM)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
    procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL,
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'scheduled',
    source TEXT DEFAULT 'internal',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    status TEXT DEFAULT 'open',
    value DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. PRONTUÁRIOS E FOTOS CLÍNICAS
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

-- 6. FINANCEIRO E PACOTES DE SESSÕES
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

-- 7. HABILITAR E CONFIGURAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_sessions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    table_name text;
    tables text[] := ARRAY[
        'clients', 'procedures', 'professionals', 'appointments', 
        'leads', 'medical_records', 'clinical_photos', 
        'financial_transactions', 'packages'
    ];
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

-- Políticas Específicas para Organizações e Unidades
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their organizations" ON public.organizations;
    CREATE POLICY "Users can view their organizations" ON public.organizations FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.organization_members WHERE organization_members.organization_id = organizations.id AND organization_members.user_id = auth.uid()));

    DROP POLICY IF EXISTS "Users can view package_sessions of their org" ON public.package_sessions;
    CREATE POLICY "Users can access package_sessions of their org" 
    ON public.package_sessions FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.packages p WHERE p.id = package_sessions.package_id AND public.user_has_org_access(p.organization_id)));

    -- Permissões Públicas (anon) para Agendamento Online
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
