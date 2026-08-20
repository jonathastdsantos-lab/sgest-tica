import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './use-auth';

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

export function useTenant() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setIsLoading(false);
      return;
    }

    const fetchOrganizations = async () => {
      setIsLoading(true);
      // Aqui buscamos as organizações que o usuário tem acesso, usando a policy que já definimos no Supabase
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, logo_url');

      if (!error && data) {
        setOrganizations(data);
        if (data.length > 0) {
          // Seleciona a primeira organização por padrão. Em uma implementação futura,
          // podemos salvar essa preferência no localStorage ou no default_unit_id do usuário.
          setCurrentOrganization(data[0]);
        }
      }
      setIsLoading(false);
    };

    fetchOrganizations();
  }, [user]);

  const switchOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
    }
  };

  const createOrganization = async (name: string, phone: string) => {
    setIsLoading(true);
    const { data, error } = await supabase.rpc('create_new_organization', {
      org_name: name,
      org_phone: phone,
    });

    if (error) {
      setIsLoading(false);
      throw error;
    }

    // Após criar, busca as organizações novamente
    const { data: fetch, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, logo_url');

    if (!fetchError && fetch) {
      setOrganizations(fetch);
      if (fetch.length > 0) {
        // Encontra a organização recém criada ou usa a primeira
        const newOrg = fetch.find((o) => o.id === data) || fetch[0];
        setCurrentOrganization(newOrg);
      }
    }
    setIsLoading(false);
    return data;
  };

  return {
    organizations,
    currentOrganization,
    switchOrganization,
    createOrganization,
    isLoading,
  };
}
