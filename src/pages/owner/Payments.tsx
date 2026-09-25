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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, CreditCard } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type PaymentMethod = Database['public']['Enums']['payment_method'];
type PaymentStatus = Database['public']['Enums']['payment_status'];

export default function PaymentsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    tenant_id: '', amount: '', payment_method: '' as string,
    period_month: String(new Date().getMonth() + 1),
    period_year: String(new Date().getFullYear()),
    status: 'paid' as PaymentStatus,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('*, tenants(full_name, units(name, buildings(name)))')
        .eq('owner_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: tenants } = useQuery({
    queryKey: ['tenants', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('id, full_name, unit_id, units(monthly_rent)').eq('owner_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const addPayment = useMutation({
    mutationFn: async () => {
      const tenant = tenants?.find(t => t.id === form.tenant_id);
      const { error } = await supabase.from('payments').insert({
        owner_id: user!.id,
        tenant_id: form.tenant_id,
        unit_id: tenant?.unit_id || null,
        amount: parseFloat(form.amount),
        payment_method: (form.payment_method || null) as PaymentMethod | null,
        period_month: parseInt(form.period_month),
        period_year: parseInt(form.period_year),
        status: form.status,
        paid_at: form.status === 'paid' ? new Date().toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      setOpen(false);
      toast({ title: '✓' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });

  const formatAmount = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount) + ' ' + t('common.fcfa');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">{t('payments.title')}</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />{t('payments.add')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{t('payments.add')}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t('nav.tenants')}</Label>
                <Select value={form.tenant_id} onValueChange={v => {
                  const tenant = tenants?.find(t => t.id === v);
                  setForm(f => ({ ...f, tenant_id: v, amount: String((tenant as any)?.units?.monthly_rent || '') }));
                }}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>{tenants?.map(t => <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>{t('common.amount')} ({t('common.fcfa')})</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
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
              <div>
                <Label>{t('payments.method')}</Label>
                <Select value={form.payment_method} onValueChange={v => setForm(f => ({ ...f, payment_method: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orange_money">{t('payments.orangeMoney')}</SelectItem>
                    <SelectItem value="mtn_momo">{t('payments.mtnMomo')}</SelectItem>
                    <SelectItem value="cash">{t('payments.cash')}</SelectItem>
                    <SelectItem value="bank_transfer">{t('payments.bankTransfer')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('common.status')}</Label>
                <Select value={form.status} onValueChange={(v: PaymentStatus) => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">{t('payments.paid')}</SelectItem>
                    <SelectItem value="pending">{t('payments.pending')}</SelectItem>
                    <SelectItem value="late">{t('payments.late')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => addPayment.mutate()} disabled={!form.tenant_id || !form.amount} className="w-full">{t('common.save')}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {payments && payments.length > 0 ? (
        <div className="space-y-3">
          {payments.map(payment => (
            <Card key={payment.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{(payment as any).tenants?.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(`month.${payment.period_month}` as any)} {payment.period_year}
                      {payment.payment_method && ` · ${t(`payments.${payment.payment_method === 'orange_money' ? 'orangeMoney' : payment.payment_method === 'mtn_momo' ? 'mtnMomo' : payment.payment_method === 'bank_transfer' ? 'bankTransfer' : 'cash'}` as any)}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatAmount(Number(payment.amount))}</p>
                  <Badge variant={payment.status === 'paid' ? 'default' : payment.status === 'late' ? 'destructive' : 'secondary'}>
                    {t(`payments.${payment.status}` as any)}
                  </Badge>
                </div>
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
