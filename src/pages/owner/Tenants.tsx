import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Users, Phone, Calendar, Mail, Eye, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const emptyForm = {
  full_name: '', phone: '', email: '', guarantor_name: '', guarantor_phone: '',
  unit_id: '', move_in_date: '',
};

export default function TenantsPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [viewTenant, setViewTenant] = useState<any>(null);
  const [editTenant, setEditTenant] = useState<any>(null);
  const [deleteTenant, setDeleteTenant] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { data: tenants } = useQuery({
    queryKey: ['tenants', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenants')
        .select('*, units(name, monthly_rent, buildings(name))')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: availableUnits } = useQuery({
    queryKey: ['available-units', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('units')
        .select('*, buildings!inner(owner_id, name)')
        .eq('buildings.owner_id', user!.id)
        .eq('status', 'vacant');
      return data || [];
    },
    enabled: !!user,
  });

  // All units for editing (includes currently assigned)
  const { data: allUnits } = useQuery({
    queryKey: ['all-units', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('units')
        .select('*, buildings!inner(owner_id, name)')
        .eq('buildings.owner_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tenants').insert({
        owner_id: user!.id,
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || null,
        guarantor_name: form.guarantor_name || null,
        guarantor_phone: form.guarantor_phone || null,
        unit_id: form.unit_id || null,
        move_in_date: form.move_in_date || null,
      } as any);
      if (error) throw error;
      if (form.unit_id) {
        await supabase.from('units').update({ status: 'occupied' as const }).eq('id', form.unit_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['available-units'] });
      setAddOpen(false);
      setForm(emptyForm);
      toast({ title: '✓' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const oldUnitId = editTenant._originalUnitId;
      const newUnitId = form.unit_id || null;
      const { error } = await supabase.from('tenants').update({
        full_name: form.full_name,
        phone: form.phone,
        email: form.email || null,
        guarantor_name: form.guarantor_name || null,
        guarantor_phone: form.guarantor_phone || null,
        unit_id: newUnitId,
        move_in_date: form.move_in_date || null,
      }).eq('id', editTenant.id);
      if (error) throw error;
      if (oldUnitId && oldUnitId !== newUnitId) {
        await supabase.from('units').update({ status: 'vacant' as const }).eq('id', oldUnitId);
      }
      if (newUnitId && newUnitId !== oldUnitId) {
        await supabase.from('units').update({ status: 'occupied' as const }).eq('id', newUnitId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['available-units'] });
      queryClient.invalidateQueries({ queryKey: ['all-units'] });
      setEditTenant(null);
      setForm(emptyForm);
      toast({ title: '✓' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const unitId = deleteTenant.unit_id;
      const { error } = await supabase.from('tenants').delete().eq('id', deleteTenant.id);
      if (error) throw error;
      if (unitId) {
        await supabase.from('units').update({ status: 'vacant' as const }).eq('id', unitId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['available-units'] });
      setDeleteTenant(null);
      toast({ title: '✓' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const openEdit = (tenant: any) => {
    setForm({
      full_name: tenant.full_name,
      phone: tenant.phone,
      email: tenant.email || '',
      guarantor_name: tenant.guarantor_name || '',
      guarantor_phone: tenant.guarantor_phone || '',
      unit_id: tenant.unit_id || '',
      move_in_date: tenant.move_in_date || '',
    });
    setEditTenant({ ...tenant, _originalUnitId: tenant.unit_id });
  };

  const renderFormFields = (units: any[] | undefined) => (
    <div className="space-y-4">
      <div><Label>{t('common.name')}</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
      <div><Label>{t('common.phone')}</Label><Input type="tel" placeholder="+237..." value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
      <div>
        <Label>{t('tenants.email')}</Label>
        <Input type="email" placeholder="locataire@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        <p className="text-xs text-muted-foreground mt-1">{t('tenants.emailHint')}</p>
      </div>
      <div>
        <Label>{t('tenants.assignUnit')}</Label>
        <Select value={form.unit_id} onValueChange={v => setForm(f => ({ ...f, unit_id: v }))}>
          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>
            {units?.map(u => (
              <SelectItem key={u.id} value={u.id}>
                {(u as any).buildings?.name} — {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div><Label>{t('tenants.moveInDate')}</Label><Input type="date" value={form.move_in_date} onChange={e => setForm(f => ({ ...f, move_in_date: e.target.value }))} /></div>
      <div><Label>{t('tenants.guarantor')} ({t('common.name')})</Label><Input value={form.guarantor_name} onChange={e => setForm(f => ({ ...f, guarantor_name: e.target.value }))} /></div>
      <div><Label>{t('tenants.guarantor')} ({t('common.phone')})</Label><Input type="tel" value={form.guarantor_phone} onChange={e => setForm(f => ({ ...f, guarantor_phone: e.target.value }))} /></div>
    </div>
  );

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="h-4 w-4 mt-0.5 text-muted-foreground" />
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">{t('tenants.title')}</h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{t('tenants.add')}</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{t('tenants.add')}</DialogTitle></DialogHeader>
            {renderFormFields(availableUnits)}
            <Button onClick={() => addMutation.mutate()} disabled={!form.full_name || !form.phone} className="w-full">{t('common.save')}</Button>
          </DialogContent>
        </Dialog>
      </div>

      {tenants && tenants.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map(tenant => (
            <Card key={tenant.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-full bg-primary/10">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-semibold truncate">{tenant.full_name}</p>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />{tenant.phone}
                    </div>
                    {(tenant as any).email && (
                      <p className="text-xs text-muted-foreground">{(tenant as any).email}</p>
                    )}
                    {(tenant as any).units && (
                      <p className="text-sm text-muted-foreground">
                        {(tenant as any).units.buildings?.name} — {(tenant as any).units.name}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 pt-3 border-t">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewTenant(tenant)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(tenant)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTenant(tenant)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2"><CardContent className="py-12 text-center text-muted-foreground">{t('common.noData')}</CardContent></Card>
      )}

      {/* View Dialog */}
      <Dialog open={!!viewTenant} onOpenChange={() => setViewTenant(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewTenant?.full_name}</DialogTitle></DialogHeader>
          {viewTenant && (
            <div className="divide-y">
              <InfoRow icon={Phone} label={t('common.phone')} value={viewTenant.phone} />
              <InfoRow icon={Mail} label={t('tenants.email')} value={viewTenant.email} />
              <InfoRow icon={Users} label={t('tenants.assignUnit')} value={
                (viewTenant as any).units ? `${(viewTenant as any).units.buildings?.name} — ${(viewTenant as any).units.name}` : null
              } />
              <InfoRow icon={Calendar} label={t('tenants.moveInDate')} value={
                viewTenant.move_in_date ? new Date(viewTenant.move_in_date).toLocaleDateString('fr-FR') : null
              } />
              <InfoRow icon={ShieldCheck} label={t('tenants.guarantor')} value={
                viewTenant.guarantor_name ? `${viewTenant.guarantor_name}${viewTenant.guarantor_phone ? ` (${viewTenant.guarantor_phone})` : ''}` : null
              } />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTenant} onOpenChange={() => setEditTenant(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{t('common.edit')}</DialogTitle></DialogHeader>
          {renderFormFields(allUnits)}
          <Button onClick={() => editMutation.mutate()} disabled={!form.full_name || !form.phone} className="w-full">{t('common.save')}</Button>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTenant} onOpenChange={() => setDeleteTenant(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('common.delete')}</DialogTitle></DialogHeader>
          <p className="text-muted-foreground">
            {deleteTenant?.full_name} — cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTenant(null)}>{t('common.cancel')}</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()}>{t('common.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
