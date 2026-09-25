import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type ChargeType = Database['public']['Enums']['charge_type'];

export default function ChargesPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    building_id: '', type: 'eneo' as ChargeType, total_amount: '', description: '',
    period_month: String(new Date().getMonth() + 1),
    period_year: String(new Date().getFullYear()),
  });

  const { data: charges } = useQuery({
    queryKey: ['charges', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('charges').select('*, buildings(name)').eq('owner_id', user!.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: buildings } = useQuery({
    queryKey: ['buildings', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('buildings').select('id, name').eq('owner_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const addCharge = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('charges').insert({
        owner_id: user!.id,
        building_id: form.building_id,
        type: form.type,
        total_amount: parseFloat(form.total_amount),
        period_month: parseInt(form.period_month),
        period_year: parseInt(form.period_year),
        description: form.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['charges'] });
      setOpen(false);
      setForm({ building_id: '', type: 'eneo', total_amount: '', description: '', period_month: String(new Date().getMonth() + 1), period_year: String(new Date().getFullYear()) });
      toast({ title: '✓' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const formatAmount = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount) + ' ' + t('common.fcfa');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">{t('charges.title')}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />{t('charges.add')}</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('charges.add')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('nav.buildings')}</Label>
                <Select value={form.building_id} onValueChange={v => setForm(f => ({ ...f, building_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{buildings?.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('common.type')}</Label>
                <Select value={form.type} onValueChange={(v: ChargeType) => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eneo">{t('charges.eneo')}</SelectItem>
                    <SelectItem value="camwater">{t('charges.camwater')}</SelectItem>
                    <SelectItem value="other">{t('charges.other')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>{t('charges.totalAmount')} ({t('common.fcfa')})</Label><Input type="number" value={form.total_amount} onChange={e => setForm(f => ({ ...f, total_amount: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t('common.month')}</Label>
                  <Select value={form.period_month} onValueChange={v => setForm(f => ({ ...f, period_month: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{Array.from({ length: 12 }, (_, i) => <SelectItem key={i + 1} value={String(i + 1)}>{t(`month.${i + 1}` as any)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>{t('common.year')}</Label><Input type="number" value={form.period_year} onChange={e => setForm(f => ({ ...f, period_year: e.target.value }))} /></div>
              </div>
              <div><Label>{t('common.description')}</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <Button onClick={() => addCharge.mutate()} disabled={!form.building_id || !form.total_amount} className="w-full">{t('common.save')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {charges && charges.length > 0 ? (
        <div className="space-y-3">
          {charges.map(charge => (
            <Card key={charge.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-warning" />
                  <div>
                    <p className="font-medium">{t(`charges.${charge.type}` as any)}</p>
                    <p className="text-sm text-muted-foreground">{(charge as any).buildings?.name} · {t(`month.${charge.period_month}` as any)} {charge.period_year}</p>
                  </div>
                </div>
                <p className="font-semibold">{formatAmount(Number(charge.total_amount))}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2"><CardContent className="py-12 text-center text-muted-foreground">{t('common.noData')}</CardContent></Card>
      )}
    </div>
  );
}
