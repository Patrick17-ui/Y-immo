CREATE POLICY "Tenants can view their own building"
ON public.buildings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tenants
    JOIN units ON units.id = tenants.unit_id
    WHERE units.building_id = buildings.id
      AND tenants.user_id = auth.uid()
  )
);