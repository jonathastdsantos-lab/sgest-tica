-- SGEstética (Versão 1 - Fase 7) - Database Indexes for Performance
-- Run this script in the Supabase SQL Editor AFTER schema_phase3.sql

-- 1. Organizations & Units
CREATE INDEX IF NOT EXISTS idx_units_org_id ON public.units(organization_id);

-- 2. Clients
CREATE INDEX IF NOT EXISTS idx_clients_org_id ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON public.clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON public.clients(created_at);

-- 3. Professionals
CREATE INDEX IF NOT EXISTS idx_professionals_org_id ON public.professionals(organization_id);
CREATE INDEX IF NOT EXISTS idx_professional_units_prof_id ON public.professional_units(professional_id);
CREATE INDEX IF NOT EXISTS idx_professional_units_unit_id ON public.professional_units(unit_id);

-- 4. Procedures
CREATE INDEX IF NOT EXISTS idx_procedures_org_id ON public.procedures(organization_id);

-- 5. Appointments (Critical for queries)
CREATE INDEX IF NOT EXISTS idx_appointments_org_id ON public.appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_unit_id ON public.appointments(unit_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_prof_id ON public.appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_at ON public.appointments(start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON public.appointments(created_at);

-- 6. Leads (CRM)
CREATE INDEX IF NOT EXISTS idx_leads_org_id ON public.leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_leads_unit_id ON public.leads(unit_id);
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON public.leads(client_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON public.leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);

-- 7. Organization Members (For RLS fast evaluation)
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
