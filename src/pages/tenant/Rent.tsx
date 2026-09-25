import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditCard, Smartphone, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

export default function TenantRent() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentStep, setPaymentStep] = useState<'select' | 'pending' | 'success' | 'error'>('select');
  const [monetbilPaymentId, setMonetbilPaymentId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const { data: tenantRecord } = useQuery({
    queryKey: ['my-tenant-record', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tenants')
        .select('*, units(name, monthly_rent, buildings(name))')
        .eq('user_id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: currentPayment } = useQuery({
    queryKey: ['my-current-payment', user?.id],
    queryFn: async () => {
      if (!tenantRecord) return null;
      const now = new Date();
      const { data } = await supabase
        .from('payments')
        .select('*')
        .eq('tenant_id', tenantRecord.id)
        .eq('period_month', now.getMonth() + 1)
        .eq('period_year', now.getFullYear())
        .maybeSingle();
      return data;
    },
    enabled: !!tenantRecord,
  });

  // Initiate payment via Monetbil
  const initiatePayment = useMutation({
    mutationFn: async () => {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/monetbil-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'placePayment',
            amount: rent,
            phonenumber: phoneNumber.startsWith('237') ? phoneNumber : `237${phoneNumber}`,
            operator: selectedMethod,
            payment_id: currentPayment?.id,
            tenant_name: tenantRecord?.full_name,
            email: tenantRecord?.email,
          }),
        }
      );
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.status !== 'REQUEST_ACCEPTED') {
        throw new Error(data.message || 'Paiement refusé');
      }
      return data;
    },
    onSuccess: (data) => {
      setMonetbilPaymentId(data.paymentId);
      setPaymentStep('pending');
    },
    onError: (err: Error) => {
      setErrorMessage(err.message);
      setPaymentStep('error');
    },
  });

  // Check payment status
  const checkPaymentStatus = useCallback(async () => {
    if (!monetbilPaymentId) return;
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/monetbil-payment`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'checkPayment', paymentId: monetbilPaymentId }),
        }
      );
      const data = await response.json();
      if (data?.transaction?.status === 1) {
        setPaymentStep('success');
        queryClient.invalidateQueries({ queryKey: ['my-current-payment'] });
      } else if (data?.transaction?.status === -1) {
        setErrorMessage('Paiement annulé');
        setPaymentStep('error');
      }
      // status 0 or pending => keep polling
    } catch {
      // silently retry
    }
  }, [monetbilPaymentId, queryClient]);

  // Poll for payment result when pending
  useEffect(() => {
    if (paymentStep !== 'pending' || !monetbilPaymentId) return;
    const interval = setInterval(checkPaymentStatus, 5000);
    return () => clearInterval(interval);
  }, [paymentStep, monetbilPaymentId, checkPaymentStatus]);

  const rent = (tenantRecord as any)?.units?.monthly_rent || 0;
  const formatAmount = (amount: number) => new Intl.NumberFormat('fr-FR').format(amount) + ' ' + t('common.fcfa');
  const isPaid = currentPayment?.status === 'paid';

  const paymentMethods = [
    { id: 'orange_money', label: t('payments.orangeMoney'), color: 'bg-orange-500', icon: '🟠' },
    { id: 'mtn_momo', label: t('payments.mtnMomo'), color: 'bg-yellow-500', icon: '🟡' },
  ];

  const resetDialog = () => {
    setPayDialogOpen(false);
    setSelectedMethod(null);
    setPhoneNumber('');
    setPaymentStep('select');
    setMonetbilPaymentId(null);
    setErrorMessage('');
  };

  if (!tenantRecord) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="border-0 shadow-sm max-w-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>{t('common.noData')}</p>
            <p className="text-sm mt-2">Votre propriétaire doit d'abord vous enregistrer dans le système.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('tenant.myRent')}</h1>

      <Card className="border-0 shadow-lg overflow-hidden">
        <div className="bg-primary p-6 text-primary-foreground">
          <p className="text-sm opacity-80">{(tenantRecord as any).units?.buildings?.name} — {(tenantRecord as any).units?.name}</p>
          <p className="text-4xl font-bold mt-2">{formatAmount(rent)}</p>
          <p className="text-sm opacity-80 mt-1">
            {t(`month.${new Date().getMonth() + 1}` as any)} {new Date().getFullYear()}
          </p>
        </div>
        <CardContent className="p-6">
          {isPaid ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/10">
              <CheckCircle2 className="h-8 w-8 text-accent" />
              <div>
                <p className="font-semibold text-accent">{t('payments.paymentSuccess')}</p>
                <p className="text-sm text-muted-foreground">
                  {currentPayment?.paid_at && new Date(currentPayment.paid_at).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          ) : (
            <Button
              className="w-full h-14 text-lg bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => { resetDialog(); setPayDialogOpen(true); }}
            >
              <CreditCard className="mr-2 h-6 w-6" />
              {t('tenant.payRent')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={payDialogOpen} onOpenChange={(open) => { if (!open) resetDialog(); }}>
        <DialogContent className="max-w-sm">
          {paymentStep === 'success' && (
            <div className="py-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-accent mx-auto" />
              <p className="text-xl font-bold">{t('payments.paymentSuccess')}</p>
              <Button onClick={resetDialog} className="w-full">{t('common.close')}</Button>
            </div>
          )}

          {paymentStep === 'error' && (
            <div className="py-8 text-center space-y-4">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
              <p className="text-xl font-bold">Échec du paiement</p>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
              <Button onClick={() => setPaymentStep('select')} variant="outline" className="w-full">
                Réessayer
              </Button>
            </div>
          )}

          {paymentStep === 'pending' && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="h-16 w-16 text-primary mx-auto animate-spin" />
              <p className="text-xl font-bold">Paiement en cours...</p>
              <p className="text-sm text-muted-foreground">
                Validez le paiement sur votre téléphone puis patientez.
              </p>
              <Button onClick={checkPaymentStatus} variant="outline" className="w-full">
                Vérifier le statut
              </Button>
            </div>
          )}

          {paymentStep === 'select' && (
            <>
              <DialogHeader>
                <DialogTitle>{t('tenant.selectMethod')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {paymentMethods.map(method => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                      selectedMethod === method.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <span className="text-2xl">{method.icon}</span>
                    <span className="font-medium">{method.label}</span>
                  </button>
                ))}

                {selectedMethod && (
                  <div className="pt-2">
                    <label className="text-sm font-medium mb-1 block">
                      Numéro de téléphone
                    </label>
                    <Input
                      placeholder="6XXXXXXXX"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                      maxLength={12}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Numéro {selectedMethod === 'orange_money' ? 'Orange Money' : 'MTN MoMo'} sans le 237
                    </p>
                  </div>
                )}

                <div className="pt-3">
                  <p className="text-center text-2xl font-bold mb-4">{formatAmount(rent)}</p>
                  <Button
                    className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground"
                    disabled={!selectedMethod || !phoneNumber || phoneNumber.length < 8 || rent <= 0 || initiatePayment.isPending}
                    onClick={() => initiatePayment.mutate()}
                  >
                    {initiatePayment.isPending ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Smartphone className="mr-2 h-5 w-5" />
                    )}
                    {initiatePayment.isPending ? t('common.loading') : t('payments.payNow')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
