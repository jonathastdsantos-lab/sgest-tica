-- Migration para Bloco 2: Pacotes de Sessões e Consumo de Sessões

CREATE TABLE IF NOT EXISTS public.packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    procedure_id UUID REFERENCES public.procedures(id) ON DELETE SET NULL,
    total_sessions INT NOT NULL,
    price_paid NUMERIC DEFAULT 0,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active', -- 'active' | 'completed' | 'expired'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.package_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id UUID NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_sessions ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can access packages of their org" ON public.packages;
    CREATE POLICY "Users can access packages of their org" 
    ON public.packages FOR ALL 
    USING (public.user_has_org_access(organization_id));

    DROP POLICY IF EXISTS "Users can access package_sessions of their org" ON public.package_sessions;
    CREATE POLICY "Users can access package_sessions of their org" 
    ON public.package_sessions FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM public.packages p 
            WHERE p.id = package_sessions.package_id 
            AND public.user_has_org_access(p.organization_id)
        )
    );
END;
$$;
