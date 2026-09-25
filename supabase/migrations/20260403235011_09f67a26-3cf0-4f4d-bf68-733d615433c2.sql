
-- Add email column to tenants
ALTER TABLE public.tenants ADD COLUMN email text;

-- Create function to auto-link tenant on login by matching email
CREATE OR REPLACE FUNCTION public.link_tenant_on_login()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tenants
  SET user_id = NEW.id
  WHERE email = NEW.email
    AND user_id IS NULL;
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert (new signup)
CREATE TRIGGER on_auth_user_created_link_tenant
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.link_tenant_on_login();
