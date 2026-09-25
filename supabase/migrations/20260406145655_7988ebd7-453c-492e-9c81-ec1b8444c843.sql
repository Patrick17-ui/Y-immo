CREATE POLICY "Tenants can view their own unit"
ON public.units
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tenants
    WHERE tenants.unit_id = units.id
      AND tenants.user_id = auth.uid()
  )
);