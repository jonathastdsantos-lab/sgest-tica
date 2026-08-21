-- Migration para Bloco 1: Galeria de Fotos e Consentimento
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS photo_consent BOOLEAN DEFAULT false;

-- Bucket de storage para fotos clínicas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('clinical-photos', 'clinical-photos', true) 
ON CONFLICT (id) DO NOTHING;

-- RLS Policy para storage.objects
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public access to clinical photos" ON storage.objects;
    CREATE POLICY "Public access to clinical photos" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'clinical-photos');

    DROP POLICY IF EXISTS "Authenticated upload to clinical photos" ON storage.objects;
    CREATE POLICY "Authenticated upload to clinical photos" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'clinical-photos' AND auth.role() = 'authenticated');
END $$;
