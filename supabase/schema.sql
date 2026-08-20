-- SGEstética (Versão 1) - Database Schema
-- Run this script in the Supabase SQL Editor

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- ORGANIZATIONS (Clínicas)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    legal_name TEXT,
    document TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    currency TEXT DEFAULT 'BRL',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- UNITS (Unidades)
CREATE TABLE IF NOT EXISTS public.units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address_line TEXT,
    address_number TEXT,
    address_complement TEXT,
    neighborhood TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PROFILES (Usuários Autenticados)
-- Extended from auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ROLES
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ORGANIZATION MEMBERS (Vínculo Usuário <-> Clínica <-> Função)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    default_unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

-- PERMISSIONS
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key TEXT UNIQUE NOT NULL,
    module TEXT NOT NULL,
    description TEXT
);

-- ROLE PERMISSIONS
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- USER UNITS (Vínculo Usuário <-> Múltiplas Unidades)
CREATE TABLE IF NOT EXISTS public.user_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    UNIQUE(user_id, unit_id)
);

-- PROFESSIONALS
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    professional_name TEXT,
    document TEXT,
    phone TEXT,
    email TEXT,
    specialty TEXT,
    registration_number TEXT,
    registration_type TEXT,
    avatar_url TEXT,
    color TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;


-- 4. RLS POLICIES

-- PROFILES Policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- ORGANIZATIONS Policies
-- Users can view organizations they belong to
CREATE POLICY "Users can view their organizations" 
ON public.organizations FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_members.organization_id = organizations.id 
        AND organization_members.user_id = auth.uid()
        AND organization_members.active = true
    )
);

-- UNITS Policies
-- Users can view units of their organizations
CREATE POLICY "Users can view units of their organizations" 
ON public.units FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_members 
        WHERE organization_members.organization_id = units.organization_id 
        AND organization_members.user_id = auth.uid()
        AND organization_members.active = true
    )
);

-- ORGANIZATION MEMBERS Policies
-- Users can view members of their organizations
CREATE POLICY "Users can view members of their organizations" 
ON public.organization_members FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid() AND active = true
    )
);

-- ROLES Policies
CREATE POLICY "Users can view roles of their organizations" 
ON public.roles FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid() AND active = true
    )
);

-- PROFESSIONALS Policies
CREATE POLICY "Users can view professionals of their organizations" 
ON public.professionals FOR SELECT 
USING (
    organization_id IN (
        SELECT organization_id FROM public.organization_members 
        WHERE user_id = auth.uid() AND active = true
    )
);

-- PERMISSIONS (Read-only for authenticated users)
CREATE POLICY "Authenticated users can view permissions"
ON public.permissions FOR SELECT
TO authenticated
USING (true);

-- ROLE PERMISSIONS
CREATE POLICY "Users can view role permissions of their organizations"
ON public.role_permissions FOR SELECT
USING (
    role_id IN (
        SELECT id FROM public.roles
        WHERE organization_id IN (
            SELECT organization_id FROM public.organization_members 
            WHERE user_id = auth.uid() AND active = true
        )
    )
);

-- 5. SEED DATA (Permissions)
INSERT INTO public.permissions (key, module, description) VALUES
('agenda.view', 'Agenda', 'Visualizar agenda'),
('agenda.create', 'Agenda', 'Criar agendamentos'),
('agenda.edit', 'Agenda', 'Editar agendamentos'),
('agenda.delete', 'Agenda', 'Excluir agendamentos'),
('clients.view', 'Clientes', 'Visualizar clientes'),
('clients.create', 'Clientes', 'Cadastrar clientes'),
('clients.edit', 'Clientes', 'Editar clientes'),
('clients.delete', 'Clientes', 'Excluir clientes'),
('crm.view', 'CRM', 'Visualizar CRM'),
('crm.manage', 'CRM', 'Gerenciar CRM'),
('financial.view', 'Financeiro', 'Visualizar financeiro'),
('financial.manage', 'Financeiro', 'Gerenciar financeiro'),
('reports.view', 'Relatórios', 'Visualizar relatórios'),
('settings.manage', 'Configurações', 'Gerenciar configurações'),
('users.manage', 'Usuários', 'Gerenciar usuários'),
('professionals.manage', 'Profissionais', 'Gerenciar profissionais'),
('medical_records.view', 'Prontuários', 'Visualizar prontuários'),
('medical_records.edit', 'Prontuários', 'Editar prontuários')
ON CONFLICT (key) DO NOTHING;

-- 6. FUNCTIONS & TRIGGERS

-- Automatically create profile when a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    new.email, 
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger to update 'updated_at' automatically
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach update_modified_column to all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%I_modtime ON public.%I;
            CREATE TRIGGER update_%I_modtime 
            BEFORE UPDATE ON public.%I 
            FOR EACH ROW EXECUTE FUNCTION update_modified_column();
        ', t, t, t, t);
    END LOOP;
END;
$$;
