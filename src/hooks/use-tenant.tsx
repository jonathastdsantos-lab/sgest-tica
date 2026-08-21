import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './use-auth';

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

export interface Unit {
  id: string;
  name: string;
}

export function useTenant() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  
  const [units, setUnits] = useState<Unit[]>([]);
  const [currentUnit, setCurrentUnit] = useState<Unit | null>(null); // null significa "Todas as unidades"
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setUnits([]);
      setCurrentUnit(null);
      setIsLoading(false);
      return;
    }

    const fetchOrganizations = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, logo_url');

      if (!error && data) {
        setOrganizations(data);
        if (data.length > 0) {
          setCurrentOrganization(data[0] ?? null);
        }
      }
      setIsLoading(false);
    };

    fetchOrganizations();
  }, [user]);

  useEffect(() => {
    if (!currentOrganization) {
      setUnits([]);
      setCurrentUnit(null);
      return;
    }

    const fetchUnits = async () => {
      const { data } = await supabase
        .from('units')
        .select('id, name')
        .eq('organization_id', currentOrganization.id)
        .order('name');
      
      if (data) {
        setUnits(data);
        setCurrentUnit(null); // Por padrão: Todas as unidades
      }
    };

    fetchUnits();
  }, [currentOrganization]);

  const switchOrganization = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    if (org) {
      setCurrentOrganization(org);
    }
  };

  const switchUnit = (unitId: string | null) => {
    if (!unitId) {
      setCurrentUnit(null);
    } else {
      const unit = units.find(u => u.id === unitId);
      if (unit) setCurrentUnit(unit);
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

    const { data: fetch, error: fetchError } = await supabase
      .from('organizations')
      .select('id, name, logo_url');

    if (!fetchError && fetch) {
      setOrganizations(fetch);
      if (fetch.length > 0) {
        const newOrg = fetch.find((o) => o.id === data) ?? fetch[0] ?? null;
        setCurrentOrganization(newOrg);
      }
    }
    setIsLoading(false);
    return data;
  };

  return {
    organizations,
    currentOrganization,
    tenant: currentOrganization, // alias para compatibilidade com o app antigo
    units,
    currentUnit,
    switchOrganization,
    switchUnit,
    createOrganization,
    isLoading,
  };
}
