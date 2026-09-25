import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, MapPin, Home, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Database } from '@/integrations/supabase/types';

type UnitType = Database['public']['Enums']['unit_type'];

export default function BuildingsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', address: '', neighborhood: '' });
  const [unitForm, setUnitForm] = useState({ name: '', type: 'apartment' as UnitType, monthly_rent: '' });

  const { data: buildings, isLoading } = useQuery({
    queryKey: ['buildings', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('buildings')
        .select('*, units(*)')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const addBuilding = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('buildings').insert({
        owner_id: user!.id,
        name: form.name,
        address: form.address,
        neighborhood: form.neighborhood || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setOpen(false);
      setForm({ name: '', address: '', neighborhood: '' });
      toast({ title: '✓' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const addUnit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('units').insert({
        building_id: selectedBuildingId!,
        name: unitForm.name,
        type: unitForm.type,
        monthly_rent: parseFloat(unitForm.monthly_rent) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      setUnitDialogOpen(false);
      setUnitForm({ name: '', type: 'apartment', monthly_rent: '' });
      toast({ title: '✓' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const deleteBuilding = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('buildings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buildings'] });
      toast({ title: '✓' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">{t('buildings.title')}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{t('buildings.add')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('buildings.add')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>{t('buildings.name')}</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>{t('common.address')}</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div><Label>{t('buildings.neighborhood')}</Label><Input placeholder="Bastos, Emana..." value={form.neighborhood} onChange={e => setForm(f => ({ ...f, neighborhood: e.target.value }))} /></div>
              <Button onClick={() => addBuilding.mutate()} disabled={!form.name || !form.address} className="w-full">{t('common.save')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{t('common.loading')}</p>
      ) : buildings && buildings.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buildings.map(building => (
            <Card key={building.id} className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">{building.name}</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteBuilding.mutate(building.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {building.address}
                  {building.neighborhood && ` · ${building.neighborhood}`}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(building as any).units?.map((unit: any) => (
                  <div key={unit.id} className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{unit.name}</p>
                        <p className="text-xs text-muted-foreground">{t(`unit.${unit.type}` as any)} · {new Intl.NumberFormat('fr-FR').format(unit.monthly_rent)} {t('common.fcfa')}</p>
                      </div>
                    </div>
                    <Badge variant={unit.status === 'occupied' ? 'default' : 'secondary'}>
                      {t(`unit.${unit.status}` as any)}
                    </Badge>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => { setSelectedBuildingId(building.id); setUnitDialogOpen(true); }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />{t('buildings.addUnit')}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2"><CardContent className="py-12 text-center text-muted-foreground">{t('common.noData')}</CardContent></Card>
      )}

      {/* Add unit dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('buildings.addUnit')}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>{t('buildings.unitName')}</Label><Input placeholder="App A1, Studio B2..." value={unitForm.name} onChange={e => setUnitForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>
              <Label>{t('buildings.unitType')}</Label>
              <Select value={unitForm.type} onValueChange={(v: UnitType) => setUnitForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">{t('unit.apartment')}</SelectItem>
                  <SelectItem value="studio">{t('unit.studio')}</SelectItem>
                  <SelectItem value="shop">{t('unit.shop')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>{t('buildings.monthlyRent')} ({t('common.fcfa')})</Label><Input type="number" value={unitForm.monthly_rent} onChange={e => setUnitForm(f => ({ ...f, monthly_rent: e.target.value }))} /></div>
            <Button onClick={() => addUnit.mutate()} disabled={!unitForm.name || !unitForm.monthly_rent} className="w-full">{t('common.save')}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
