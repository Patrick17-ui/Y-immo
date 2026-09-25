import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import NotFound from "./pages/NotFound.tsx";
import AuthPage from "./pages/AuthPage";
import { OwnerLayout } from "./layouts/OwnerLayout";
import { TenantLayout } from "./layouts/TenantLayout";
import OwnerDashboard from "./pages/owner/Dashboard";
import BuildingsPage from "./pages/owner/Buildings";
import TenantsPage from "./pages/owner/Tenants";
import PaymentsPage from "./pages/owner/Payments";
import ChargesPage from "./pages/owner/Charges";
import ContractsPage from "./pages/owner/Contracts";
import OwnerComplaintsPage from "./pages/owner/Complaints";
import TenantRent from "./pages/tenant/Rent";
import TenantReceipts from "./pages/tenant/Receipts";
import TenantHistory from "./pages/tenant/History";
import TenantComplaints from "./pages/tenant/Complaints";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Y-Immo</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  if (!role) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  if (role === 'owner') {
    return (
      <Routes>
        <Route path="/owner" element={<OwnerLayout><OwnerDashboard /></OwnerLayout>} />
        <Route path="/owner/buildings" element={<OwnerLayout><BuildingsPage /></OwnerLayout>} />
        <Route path="/owner/tenants" element={<OwnerLayout><TenantsPage /></OwnerLayout>} />
        <Route path="/owner/payments" element={<OwnerLayout><PaymentsPage /></OwnerLayout>} />
        <Route path="/owner/charges" element={<OwnerLayout><ChargesPage /></OwnerLayout>} />
        <Route path="/owner/contracts" element={<OwnerLayout><ContractsPage /></OwnerLayout>} />
        <Route path="/owner/complaints" element={<OwnerLayout><OwnerComplaintsPage /></OwnerLayout>} />
        <Route path="/" element={<Navigate to="/owner" replace />} />
        <Route path="*" element={<Navigate to="/owner" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/tenant" element={<TenantLayout><TenantRent /></TenantLayout>} />
      <Route path="/tenant/receipts" element={<TenantLayout><TenantReceipts /></TenantLayout>} />
      <Route path="/tenant/complaints" element={<TenantLayout><TenantComplaints /></TenantLayout>} />
      <Route path="/tenant/history" element={<TenantLayout><TenantHistory /></TenantLayout>} />
      <Route path="/" element={<Navigate to="/tenant" replace />} />
      <Route path="*" element={<Navigate to="/tenant" replace />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
