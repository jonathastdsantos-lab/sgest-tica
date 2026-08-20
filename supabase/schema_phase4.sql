-- SGEstética (Versão 1 - Fase 4) - Prontuários e Atendimentos
-- Run this script in the Supabase SQL Editor AFTER schema_phase3.sql

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
    -- Para evolução/laudo será texto rico.
    -- Para anamnese, será JSONB (ou preenchimento padronizado).
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
    photo_type TEXT DEFAULT 'before', -- 'before', 'after', 'follow_up'
    body_part TEXT,
    notes TEXT,
    
    date_taken TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);


-- ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_photos ENABLE ROW LEVEL SECURITY;


-- RLS POLICIES (Pattern: User must be active member of the organization)
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

-- Trigger to update 'updated_at' automatically for new tables
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
