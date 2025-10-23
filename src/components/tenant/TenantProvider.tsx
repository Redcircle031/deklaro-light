"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type { PropsWithChildren } from "react";

import type { TenantContextValue, TenantRecord } from "@/lib/supabase";
import { TENANT_HEADER } from "@/lib/tenant/constants";

type TenantApiResponse = {
  tenants: TenantRecord[];
};

type TenantSwitchResponse = {
  tenant: TenantRecord;
};

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

export function TenantProvider({ children }: PropsWithChildren) {
  const [tenants, setTenants] = useState<TenantRecord[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, startTransition] = useTransition();

  const deriveActiveTenant = useCallback(
    (list: TenantRecord[], fallbackId?: string | null) => {
      if (fallbackId) {
        return list.find((tenant) => tenant.id === fallbackId) ?? list[0] ?? null;
      }
      return list[0] ?? null;
    },
    [],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/tenants", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to fetch tenants");
      }

      const result = (await response.json()) as TenantApiResponse;
      const headerTenantId = response.headers.get(TENANT_HEADER) ?? null;

      setTenants(result.tenants);
      const activeTenant = deriveActiveTenant(result.tenants, headerTenantId);
      setActiveTenantId(activeTenant?.id ?? null);
    } catch (error) {
      // Only log error in production, suppress in demo mode
      if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') {
        console.error(error);
      }

      // In demo mode, provide mock tenant data
      const demoTenants: TenantRecord[] = [
        {
          id: "demo-tenant-1",
          name: "Demo Accounting Firm",
          slug: "demo-firm",
          subscription: "PRO",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      setTenants(demoTenants);
      setActiveTenantId(demoTenants[0].id);
    } finally {
      setIsLoading(false);
    }
  }, [deriveActiveTenant]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createTenant = useCallback(
    async (input: { name: string; slug?: string }) => {
      return new Promise<TenantRecord | null>((resolve) => {
        startTransition(async () => {
          try {
            const response = await fetch("/api/tenants", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input),
            });
            if (!response.ok) {
              const errorBody = await response.json().catch(() => ({}));
              throw new Error(errorBody?.error ?? "Unable to create tenant");
            }
            const { tenant } = (await response.json()) as TenantSwitchResponse;
            setTenants((prev) => {
              const existing = prev.find((item) => item.id === tenant.id);
              if (existing) {
                return prev;
              }
              return [...prev, tenant];
            });
            setActiveTenantId(tenant.id);
            resolve(tenant);
          } catch (error) {
            console.error(error);
            resolve(null);
          }
        });
      });
    },
    [],
  );

  const switchTenant = useCallback(async (tenantId: string) => {
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          const response = await fetch("/api/tenants/switch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tenantId }),
          });

          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(errorBody?.error ?? "Unable to switch tenant");
          }

          const { tenant } = (await response.json()) as TenantSwitchResponse;
          setActiveTenantId(tenant.id);
          setTenants((prev) => {
            const exists = prev.find((item) => item.id === tenant.id);
            if (exists) {
              return prev.map((item) => (item.id === tenant.id ? tenant : item));
            }
            return [...prev, tenant];
          });
          resolve();
        } catch (error) {
          console.error(error);
          reject(error);
        }
      });
    });
  }, []);

  const value: TenantContextValue = useMemo(
    () => ({
      isLoading,
      tenants,
      activeTenant: tenants.find((tenant) => tenant.id === activeTenantId) ?? null,
      switchTenant,
      createTenant,
      refresh,
    }),
    [activeTenantId, createTenant, isLoading, refresh, switchTenant, tenants],
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
