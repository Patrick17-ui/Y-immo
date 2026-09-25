import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';

export default function TenantHistory() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const { data: tenantRecord } = useQuery({
    queryKey: ['my-tenant-record', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('tenants').select('id').eq('user_id', user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: payments } = useQuery({
    queryKey: ['my-payments', tenantRecord?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantRecord!.id)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      return data || [];
    },
    enabled: !!tenantRecord,
  });

  const formatAmount = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount) + ' ' + t('common.fcfa');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.myHistory')}</h1>

      {payments && payments.length > 0 ? (
        <div className="space-y-3">
          {payments.map(payment => (
            <Card key={payment.id} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{formatAmount(Number(payment.amount))}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(`month.${payment.period_month}` as any)} {payment.period_year}
                    </p>
                  </div>
                </div>
                <Badge variant={payment.status === 'paid' ? 'default' : payment.status === 'late' ? 'destructive' : 'secondary'}>
                  {t(`payments.${payment.status}` as any)}
                </Badge>
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
