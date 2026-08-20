-- SGEstética - Deploy Script for Phases 4 and 5
-- Run this script in the Supabase SQL Editor to apply both updates at once.

-------------------------------------------------------------------------------
-- FASE 4: Prontuários e Atendimentos
-------------------------------------------------------------------------------

-- 22. MEDICAL RECORDS (Prontuários / Laudos)
CREATE TABLE IF NOT EXISTS public.medical_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    
    -- Tipo do registro: anamnesis, evolution, prescription, consent
    record_type TEXT DEFAULT 'evolution',
    
    -- Conteúdo dinâmico dependendo do tipo.
    content TEXT,
    anamnesis_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 23. CLINICAL PHOTOS (Antes e Depois)
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

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_photos ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (Fase 4)
DO $$
DECLARE
    table_name text;
    tables text[] := ARRAY[
        'medical_records', 'clinical_photos'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables LOOP
        EXECUTE format('
            CREATE POLICY "Users can access data of their organizations" 
            ON public.%I FOR ALL 
            USING (public.user_has_org_access(organization_id));
        ', table_name);
    END LOOP;
END;
$$;

-- Trigger to update 'updated_at' automatically (Fase 4)
DO $$
DECLARE
    t text;
    tables text[] := ARRAY['medical_records'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_modtime ON public.%I;
            CREATE TRIGGER update_%I_modtime 
            BEFORE UPDATE ON public.%I 
            FOR EACH ROW EXECUTE FUNCTION update_modified_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;

-------------------------------------------------------------------------------
-- FASE 5: Gestão Financeira
-------------------------------------------------------------------------------

-- 24. FINANCIAL TRANSACTIONS
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

-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES (Fase 5)
DO $$
BEGIN
    EXECUTE '
        CREATE POLICY "Users can access data of their organizations" 
        ON public.financial_transactions FOR ALL 
        USING (public.user_has_org_access(organization_id));
    ';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Trigger to update 'updated_at' automatically (Fase 5)
DO $$
BEGIN
    EXECUTE '
        DROP TRIGGER IF EXISTS update_financial_transactions_modtime ON public.financial_transactions;
        CREATE TRIGGER update_financial_transactions_modtime 
        BEFORE UPDATE ON public.financial_transactions 
        FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    ';
END $$;
