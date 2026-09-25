import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, Home, CreditCard, AlertTriangle, TrendingUp } from 'lucide-react';

export default function OwnerDashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();

  const { data: buildings } = useQuery({
    queryKey: ['buildings', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('buildings').select('*').eq('owner_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: units } = useQuery({
    queryKey: ['units', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('units')
        .select('*, buildings!inner(owner_id)')
        .eq('buildings.owner_id', user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments-month', user?.id],
    queryFn: async () => {
      const now = new Date();
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('owner_id', user!.id)
        .eq('period_month', now.getMonth() + 1)
        .eq('period_year', now.getFullYear());
      return data || [];
    },
    enabled: !!user,
  });

  const totalUnits = units?.length || 0;
  const occupiedUnits = units?.filter(u => u.status === 'occupied').length || 0;
  const vacantUnits = totalUnits - occupiedUnits;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  const paidAmount = payments?.filter(p => p.status === 'paid').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const unpaidAmount = payments?.filter(p => p.status !== 'paid').reduce((sum, p) => sum + Number(p.amount), 0) || 0;
  const latePayments = payments?.filter(p => p.status === 'late').length || 0;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + t('common.fcfa');
  };

  const stats = [
    {
      title: t('dashboard.occupancyRate'),
      value: `${occupancyRate}%`,
      subtitle: `${occupiedUnits}/${totalUnits}`,
      icon: TrendingUp,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      title: t('dashboard.rentCollected'),
      value: formatAmount(paidAmount),
      icon: CreditCard,
      color: 'text-accent',
      bg: 'bg-accent/10',
    },
    {
      title: t('dashboard.unpaidRent'),
      value: formatAmount(unpaidAmount),
      icon: AlertTriangle,
      color: 'text-destructive',
      bg: 'bg-destructive/10',
    },
    {
      title: t('dashboard.totalUnits'),
      value: totalUnits.toString(),
      subtitle: `${occupiedUnits} ${t('dashboard.occupiedUnits').toLowerCase()} · ${vacantUnits} ${t('dashboard.vacantUnits').toLowerCase()}`,
      icon: Home,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">{t('dashboard.title')}</h1>
        {latePayments > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            <AlertTriangle className="h-3.5 w-3.5 mr-1" />
            {latePayments} {t('dashboard.latePayments').toLowerCase()}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  {stat.subtitle && (
                    <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                  )}
                </div>
                <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent payments */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.recentPayments')}</CardTitle>
        </CardHeader>
        <CardContent>
          {payments && payments.length > 0 ? (
            <div className="space-y-3">
              {payments.slice(0, 5).map(payment => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{formatAmount(Number(payment.amount))}</p>
                    <p className="text-xs text-muted-foreground">
                      {t(`month.${payment.period_month}` as any)} {payment.period_year}
                    </p>
                  </div>
                  <Badge variant={
                    payment.status === 'paid' ? 'default' :
                    payment.status === 'late' ? 'destructive' : 'secondary'
                  }>
                    {t(`payments.${payment.status}` as any)}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{t('common.noData')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
