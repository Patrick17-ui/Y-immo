import { useState } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Home, Mail, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];
type Step = 'auth' | 'role' | 'profile';

export default function AuthPage() {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('auth');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    if (!email || !password) return;
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      } else {
        // Check if user has a role already
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          if (roleData?.role) {
            window.location.reload();
          } else {
            setStep('role');
          }
        }
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: t('auth.checkEmail') });
      }
    }
    setLoading(false);
  };

  const handleSelectRole = () => {
    if (!selectedRole) return;
    setStep('profile');
  };

  const handleCompleteProfile = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('user_roles').insert({ user_id: user.id, role: selectedRole! });
    await supabase.from('profiles').update({ full_name: fullName }).eq('user_id', user.id);

    window.location.reload();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <LanguageToggle />
      </div>

      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Building2 className="h-10 w-10 text-primary" />
          <h1 className="text-4xl font-bold text-primary tracking-tight">Y-Immo</h1>
        </div>
        <p className="text-muted-foreground text-lg">{t('auth.subtitle')}</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-0 bg-card">
        {step === 'auth' && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{t('auth.title')}</CardTitle>
              <CardDescription>{isLogin ? t('auth.login') : t('auth.signup')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={t('auth.email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder={t('auth.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleAuth} disabled={loading || !email || !password} className="w-full h-12 text-base">
                {isLogin ? t('auth.login') : t('auth.signup')}
              </Button>

              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full h-12 text-base"
                onClick={async () => {
                  const result = await lovable.auth.signInWithOAuth('google', {
                    redirect_uri: window.location.origin,
                  });
                  if (result.error) {
                    toast({ title: 'Erreur', description: result.error.message, variant: 'destructive' });
                  }
                }}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continuer avec Google
              </Button>

              <Button variant="ghost" onClick={() => setIsLogin(!isLogin)} className="w-full text-sm">
                {isLogin ? t('auth.switchToSignup') : t('auth.switchToLogin')}
              </Button>
            </CardContent>
          </>
        )}

        {step === 'role' && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{t('auth.selectRole')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <button
                onClick={() => setSelectedRole('owner')}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedRole === 'owner'
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{t('auth.roleOwner')}</p>
                    <p className="text-sm text-muted-foreground">{t('auth.roleOwnerDesc')}</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedRole('tenant')}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  selectedRole === 'tenant'
                    ? 'border-accent bg-accent/5 shadow-md'
                    : 'border-border hover:border-accent/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/10">
                    <Home className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{t('auth.roleTenant')}</p>
                    <p className="text-sm text-muted-foreground">{t('auth.roleTenantDesc')}</p>
                  </div>
                </div>
              </button>

              <Button onClick={handleSelectRole} disabled={!selectedRole} className="w-full h-12 text-base mt-4">
                {t('common.confirm')}
              </Button>
            </CardContent>
          </>
        )}

        {step === 'profile' && (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{t('auth.completeProfile')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder={t('auth.fullName')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <Button onClick={handleCompleteProfile} disabled={loading || !fullName} className="w-full h-12 text-base">
                {t('common.confirm')}
              </Button>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
