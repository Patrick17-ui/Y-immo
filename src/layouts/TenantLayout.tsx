import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { NavLink } from 'react-router-dom';
import { CreditCard, FileText, MessageSquare, Clock, LogOut, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const tenantNavItems = [
  { key: 'nav.myRent' as const, path: '/tenant', icon: CreditCard },
  { key: 'nav.myReceipts' as const, path: '/tenant/receipts', icon: FileText },
  { key: 'nav.myComplaints' as const, path: '/tenant/complaints', icon: MessageSquare },
  { key: 'nav.myHistory' as const, path: '/tenant/history', icon: Clock },
];

export function TenantLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">Y-Immo</span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4 pb-20 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t z-30 safe-bottom">
        <div className="flex items-center justify-around max-w-lg mx-auto">
          {tenantNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/tenant'}
              className={({ isActive }) => cn(
                "flex flex-col items-center gap-1 py-2 px-3 text-xs font-medium transition-colors min-w-0",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="truncate">{t(item.key)}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
