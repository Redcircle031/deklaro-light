/**
 * TODO: Replace with generated types from Supabase once the prisma schema
 * is synchronized. For now we keep a minimal placeholder to preserve typings.
 */
export type TenantRole = "OWNER" | "ACCOUNTANT" | "CLIENT";

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          name?: string;
          slug?: string;
          updated_at?: string | null;
        };
      };
      tenant_members: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: TenantRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role: TenantRole;
          created_at?: string;
        };
        Update: {
          role?: TenantRole;
        };
      };
    };
    Functions: Record<string, never>;
  };
};

export type TenantRecord = {
  id: string;
  name: string;
  slug: string;
  role: TenantRole;
  createdAt: string;
};

export type TenantContextValue = {
  isLoading: boolean;
  tenants: TenantRecord[];
  activeTenant: TenantRecord | null;
  switchTenant: (tenantId: string) => Promise<void>;
  createTenant: (input: { name: string; slug?: string }) => Promise<TenantRecord | null>;
  refresh: () => Promise<void>;
};
