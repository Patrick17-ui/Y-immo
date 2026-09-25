import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/i18n/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Building2, Users, CreditCard, Zap,
  FileText, MessageSquare, Settings, LogOut, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const ownerNavItems = [
  { key: 'nav.dashboard' as const, path: '/owner', icon: LayoutDashboard },
  { key: 'nav.buildings' as const, path: '/owner/buildings', icon: Building2 },
  { key: 'nav.tenants' as const, path: '/owner/tenants', icon: Users },
  { key: 'nav.payments' as const, path: '/owner/payments', icon: CreditCard },
  { key: 'nav.charges' as const, path: '/owner/charges', icon: Zap },
  { key: 'nav.contracts' as const, path: '/owner/contracts', icon: FileText },
  { key: 'nav.complaints' as const, path: '/owner/complaints', icon: MessageSquare },
];

export function OwnerLayout({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-50 h-screen w-64 flex flex-col transition-transform duration-300 md:translate-x-0",
        "bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]",
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-5 flex items-center justify-between border-b border-[hsl(var(--sidebar-border))]">
          <div className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-[hsl(var(--sidebar-primary))]" />
            <span className="text-xl font-bold tracking-tight">Y-Immo</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3 overflow-y-auto">
          {ownerNavItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/owner'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-primary))]"
                  : "text-[hsl(var(--sidebar-foreground))]/70 hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"
              )}
            >
              <item.icon className="h-5 w-5" />
              {t(item.key)}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-[hsl(var(--sidebar-border))] space-y-2">
          <LanguageToggle className="w-full justify-start text-[hsl(var(--sidebar-foreground))]/70 hover:text-[hsl(var(--sidebar-foreground))]" />
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start text-[hsl(var(--sidebar-foreground))]/70 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('common.logout')}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 bg-card border-b px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <span className="font-bold text-lg">Y-Immo</span>
          <LanguageToggle />
        </header>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
