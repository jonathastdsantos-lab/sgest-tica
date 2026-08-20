-- SGEstética (Versão 1 - Fase 5) - Financeiro
-- Run this script in the Supabase SQL Editor AFTER schema_phase4.sql

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

-- RLS POLICIES (Pattern: User must be active member of the organization)
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

-- Trigger to update 'updated_at' automatically
DO $$
BEGIN
    EXECUTE '
        DROP TRIGGER IF EXISTS update_financial_transactions_modtime ON public.financial_transactions;
        CREATE TRIGGER update_financial_transactions_modtime 
        BEFORE UPDATE ON public.financial_transactions 
        FOR EACH ROW EXECUTE FUNCTION update_modified_column();
    ';
END $$;
