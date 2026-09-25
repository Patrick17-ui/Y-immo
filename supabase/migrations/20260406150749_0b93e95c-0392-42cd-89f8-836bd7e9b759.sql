-- Drop and recreate foreign keys with CASCADE for contracts
ALTER TABLE public.contracts
  DROP CONSTRAINT IF EXISTS contracts_tenant_id_fkey,
  ADD CONSTRAINT contracts_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Drop and recreate foreign keys with CASCADE for payments
ALTER TABLE public.payments
  DROP CONSTRAINT IF EXISTS payments_tenant_id_fkey,
  ADD CONSTRAINT payments_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Drop and recreate foreign keys with CASCADE for complaints
ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS complaints_tenant_id_fkey,
  ADD CONSTRAINT complaints_tenant_id_fkey
    FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;