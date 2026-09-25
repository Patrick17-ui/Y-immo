-- Drop the recursive policies
DROP POLICY IF EXISTS "Tenants can view their own unit" ON public.units;
DROP POLICY IF EXISTS "Tenants can view their own building" ON public.buildings;

-- Create security definer function to check if user is tenant of a unit
CREATE OR REPLACE FUNCTION public.is_tenant_of_unit(_user_id uuid, _unit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants
    WHERE user_id = _user_id AND unit_id = _unit_id
  )
$$;

-- Create security definer function to check if user is tenant in a building
CREATE OR REPLACE FUNCTION public.is_tenant_in_building(_user_id uuid, _building_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenants t
    JOIN public.units u ON u.id = t.unit_id
    WHERE t.user_id = _user_id AND u.building_id = _building_id
  )
$$;

-- Recreate policies using the security definer functions
CREATE POLICY "Tenants can view their own unit"
ON public.units
FOR SELECT
USING (public.is_tenant_of_unit(auth.uid(), id));

CREATE POLICY "Tenants can view their own building"
ON public.buildings
FOR SELECT
USING (public.is_tenant_in_building(auth.uid(), id));