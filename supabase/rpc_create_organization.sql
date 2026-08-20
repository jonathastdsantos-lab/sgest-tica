-- SGEstética - Função RPC para Criação de Organização e Unidade Inicial
-- Run this script in the Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.create_new_organization(
  org_name TEXT,
  org_phone TEXT
) RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
  new_unit_id UUID;
  user_id UUID;
  new_pipeline_id UUID;
BEGIN
  -- 1. Pega o ID do usuário autenticado
  user_id := auth.uid();
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- 2. Cria a Organização
  INSERT INTO public.organizations (name, phone, status)
  VALUES (org_name, org_phone, 'active')
  RETURNING id INTO new_org_id;

  -- 3. Cria a primeira Unidade (Sede) vinculada à Organização
  INSERT INTO public.units (organization_id, name, phone, active)
  VALUES (new_org_id, 'Sede', org_phone, true)
  RETURNING id INTO new_unit_id;

  -- 4. Vincula o usuário à organização como membro (sem role definida por enquanto)
  INSERT INTO public.organization_members (organization_id, user_id, default_unit_id, active)
  VALUES (new_org_id, user_id, new_unit_id, true);

  -- 5. Vincula o usuário à unidade
  INSERT INTO public.user_units (organization_id, user_id, unit_id)
  VALUES (new_org_id, user_id, new_unit_id);

  -- ==============================================
  -- SEED DATA (CRM, Tags, Lead Sources)
  -- ==============================================

  -- 6. Cria CRM Pipeline Padrão
  INSERT INTO public.crm_pipelines (organization_id, name)
  VALUES (new_org_id, 'Pipeline Padrão')
  RETURNING id INTO new_pipeline_id;

  -- 7. Cria CRM Stages
  INSERT INTO public.crm_stages (organization_id, pipeline_id, name, position, color) VALUES
  (new_org_id, new_pipeline_id, 'Novo Lead', 1, '#3b82f6'),
  (new_org_id, new_pipeline_id, 'Em contato', 2, '#eab308'),
  (new_org_id, new_pipeline_id, 'Avaliação Agendada', 3, '#a855f7'),
  (new_org_id, new_pipeline_id, 'Avaliação Realizada', 4, '#8b5cf6'),
  (new_org_id, new_pipeline_id, 'Proposta Enviada', 5, '#f97316'),
  (new_org_id, new_pipeline_id, 'Negociação', 6, '#ec4899'),
  (new_org_id, new_pipeline_id, 'Vendido', 7, '#22c55e'),
  (new_org_id, new_pipeline_id, 'Perdido', 8, '#ef4444');

  -- 8. Cria Tags Padrões
  INSERT INTO public.tags (organization_id, name, color) VALUES
  (new_org_id, 'VIP', '#eab308'),
  (new_org_id, 'Botox', '#3b82f6'),
  (new_org_id, 'Harmonização', '#a855f7'),
  (new_org_id, 'Recorrente', '#22c55e'),
  (new_org_id, 'Lead Instagram', '#ec4899'),
  (new_org_id, 'Aniversariante', '#f43f5e'),
  (new_org_id, 'Inativa', '#64748b');

  -- 9. Cria Origens (Lead Sources) Padrões
  INSERT INTO public.lead_sources (organization_id, name, type) VALUES
  (new_org_id, 'Instagram', 'Social'),
  (new_org_id, 'Google', 'Search'),
  (new_org_id, 'Facebook', 'Social'),
  (new_org_id, 'WhatsApp', 'Direct'),
  (new_org_id, 'Indicação', 'Referral'),
  (new_org_id, 'Google Ads', 'Paid'),
  (new_org_id, 'Meta Ads', 'Paid'),
  (new_org_id, 'Evento', 'Offline'),
  (new_org_id, 'Influenciador', 'Referral'),
  (new_org_id, 'Site', 'Organic'),
  (new_org_id, 'Orgânico', 'Organic'),
  (new_org_id, 'Outro', 'Other');

  -- Retorna o ID da organização recém criada
  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
