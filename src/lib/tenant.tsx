import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { tenants, type Tenant } from "./clinic-data";

type TenantContextValue = {
  tenant: Tenant;
  tenants: Tenant[];
  setTenantId: (id: string) => void;
};

const TenantContext = createContext<TenantContextValue | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenantId, setTenantId] = useState(tenants[0].id);

  const value = useMemo<TenantContextValue>(
    () => ({
      tenant: tenants.find((t) => t.id === tenantId) ?? tenants[0],
      tenants,
      setTenantId,
    }),
    [tenantId],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant precisa estar dentro de TenantProvider");
  return ctx;
}
