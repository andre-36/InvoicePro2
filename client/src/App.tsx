import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import Dashboard from "@/pages/dashboard";
import InvoicesPage from "@/pages/invoices";
import InvoiceDetailPage from "@/pages/invoices/invoice-detail";
import CreateInvoicePage from "@/pages/invoices/create";
import EditInvoicePage from "@/pages/invoices/edit";
import QuotationsPage from "@/pages/quotations";
import QuotationDetailPage from "@/pages/quotations/quotation-detail";
import CreateQuotationPage from "@/pages/quotations/create";
import EditQuotationPage from "@/pages/quotations/edit";
import PurchaseOrdersPage from "@/pages/purchase-orders";
import CreatePurchaseOrderPage from "@/pages/purchase-orders/create";
import EditPurchaseOrderPage from "@/pages/purchase-orders/edit";
import PurchaseOrderDetailPage from "@/pages/purchase-orders/purchase-order-detail";
import GoodsReceiptsPage from "@/pages/goods-receipts";
import CreateGoodsReceiptPage from "@/pages/goods-receipts/create";
import GoodsReceiptDetailPage from "@/pages/goods-receipts/goods-receipt-detail";
import ClientsPage from "@/pages/clients";
import CreateClientPage from "@/pages/clients/create";
import ClientDetailPage from "@/pages/clients/client-detail";
import ProductsPage from "@/pages/products";
import ProductDashboard from "@/pages/products/dashboard";
import SuppliersPage from "@/pages/suppliers";
import TransactionsPage from "@/pages/transactions";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import PrintSettingsPage from "@/pages/print-settings";
import PaymentMethodsPage from "@/pages/payment-methods";
import PaymentTypesPage from "@/pages/payment-types";
import PaymentTermsPage from "@/pages/payment-terms";
import DeliveryNotesPage from "@/pages/delivery-notes";
import DeliveryPlanningPage from "@/pages/delivery-notes/planning";
import ReturnsPage from "@/pages/returns";
import CreateReturnPage from "@/pages/returns/create";
import ReturnDetailPage from "@/pages/returns/detail";
import LoginPage from "@/pages/login";
import SetupPage from "@/pages/setup";
import { ProtectedRoute } from "@/components/protected-route";
import { useMobile } from "./hooks/use-mobile";
import { ThemeProvider } from "@/components/theme-provider";

type User = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: 'owner' | 'staff';
  storeId: number | null;
  permissions: string[];
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [location, setLocation] = useLocation();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [currentStoreId, setCurrentStoreId] = useState<number>(1);

  useEffect(() => {
    async function checkAuthAndSetup() {
      try {
        // First check if setup is needed
        const setupRes = await fetch('/api/auth/setup-status', {
          credentials: 'include'
        });
        
        if (setupRes.ok) {
          const setupData = await setupRes.json();
          if (setupData.needsSetup) {
            setNeedsSetup(true);
            setLoading(false);
            return;
          }
        }

        // Check if user is authenticated
        const res = await fetch('/api/auth/user', {
          credentials: 'include'
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);

          // If we're at the root path, redirect to dashboard
          if (location === '/') {
            setLocation('/dashboard');
          }
        }
        // If not authenticated, user will be shown login page
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    }

    checkAuthAndSetup();
  }, []);

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    setLocation('/dashboard');
  };

  const handleSetupComplete = (userData: User) => {
    setNeedsSetup(false);
    setUser(userData);
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    setLocation('/dashboard');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  if (loading) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="aluminum-manager-theme">
        <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      </ThemeProvider>
    );
  }

  // Show setup page if no users exist
  if (needsSetup) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="aluminum-manager-theme">
        <QueryClientProvider client={queryClient}>
          <SetupPage onSetupComplete={handleSetupComplete} />
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="aluminum-manager-theme">
        <QueryClientProvider client={queryClient}>
          <LoginPage onLoginSuccess={handleLoginSuccess} />
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="light" storageKey="aluminum-manager-theme">
      <QueryClientProvider client={queryClient}>
        <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
          <Sidebar 
            user={user} 
            open={sidebarOpen} 
            onToggle={toggleSidebar}
            mobileView={isMobile}
          />

          <div className={`flex-1 flex flex-col overflow-hidden ${sidebarOpen && !isMobile ? 'ml-64' : 'ml-0'}`}>
            <Header 
              toggleSidebar={toggleSidebar}
              user={user}
              currentStoreId={user?.role === 'staff' && user?.storeId ? user.storeId : currentStoreId}
              onStoreChange={setCurrentStoreId}
            />

            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
              <Switch>
                <Route path="/dashboard">
                  <ProtectedRoute permission="dashboard.view" user={user}>
                    <Dashboard />
                  </ProtectedRoute>
                </Route>
                <Route path="/invoices">
                  <ProtectedRoute permission="invoices.view" user={user}>
                    <InvoicesPage />
                  </ProtectedRoute>
                </Route>
                <Route path="/invoices/create" component={CreateInvoicePage} />
                <Route path="/invoices/new" component={CreateInvoicePage} />
                <Route path="/invoices/:id/edit">
                  {params => {
                    const id = parseInt(params.id);
                    if (isNaN(id)) {
                      return <CreateInvoicePage />;
                    }
                    return <EditInvoicePage id={id} />;
                  }}
                </Route>
                <Route path="/invoices/:id">
                  {params => {
                    const id = parseInt(params.id);
                    if (isNaN(id)) {
                      return <CreateInvoicePage />;
                    }
                    return <InvoiceDetailPage id={id} />;
                  }}
                </Route>
                <Route path="/quotations">
                  <ProtectedRoute permission="quotations.view" user={user}>
                    <QuotationsPage />
                  </ProtectedRoute>
                </Route>
                <Route path="/quotations/create" component={CreateQuotationPage} />
                <Route path="/quotations/:id/edit">
                  {params => <EditQuotationPage id={parseInt(params.id)} />}
                </Route>
                <Route path="/quotations/:id">
                  {params => <QuotationDetailPage id={parseInt(params.id)} />}
                </Route>
                <Route path="/delivery-notes">
                  <ProtectedRoute permission="delivery_notes.view" user={user}>
                    <DeliveryNotesPage />
                  </ProtectedRoute>
                </Route>
                <Route path="/delivery-notes/planning" component={DeliveryPlanningPage} />
                <Route path="/purchase-orders">
                  <ProtectedRoute permission="purchase_orders.view" user={user}>
                    <PurchaseOrdersPage />
                  </ProtectedRoute>
                </Route>
                <Route path="/purchase-orders/create" component={CreatePurchaseOrderPage} />
                <Route path="/purchase-orders/:id/edit">
                  {params => <EditPurchaseOrderPage id={parseInt(params.id)} />}
                </Route>
                <Route path="/purchase-orders/:id">
                  {params => <PurchaseOrderDetailPage id={parseInt(params.id)} />}
                </Route>
                <Route path="/goods-receipts">
                  <ProtectedRoute permission="goods_receipts.view" user={user}>
                    <GoodsReceiptsPage />
                  </ProtectedRoute>
                </Route>
                <Route path="/goods-receipts/create" component={CreateGoodsReceiptPage} />
                <Route path="/goods-receipts/:id/edit" component={GoodsReceiptDetailPage} />
                <Route path="/goods-receipts/:id" component={GoodsReceiptDetailPage} />
                <Route path="/returns">
                  <ProtectedRoute permission="returns.view" user={user}>
                    <ReturnsPage />
                  </ProtectedRoute>
                </Route>
                <Route path="/returns/create" component={CreateReturnPage} />
                <Route path="/returns/:id" component={ReturnDetailPage} />
                <Route path="/clients">
                  <ProtectedRoute permission="clients.view" user={user}>
                    <ClientsPage />
                  </ProtectedRoute>
                </Route>
                <Route path="/clients/create" component={CreateClientPage} />
                <Route path="/clients/:id" component={ClientDetailPage} />
                <Route path="/products">
                  <ProtectedRoute permission="products.view" user={user}>
                    <ProductsPage />
                  </ProtectedRoute>
                </Route>
                <Route path="/products/:id/dashboard">
                  {params => <ProductDashboard id={parseInt(params.id)} />}
                </Route>
                <Route path="/suppliers">
                  <ProtectedRoute permission="suppliers.view" user={user}>
                    <SuppliersPage />
                  </ProtectedRoute>
                </Route>
                <Route path="/transactions">
                  <ProtectedRoute permission="transactions.view" user={user}>
                    <TransactionsPage />
                  </ProtectedRoute>
                </Route>
                <Route path="/reports">
                  <ProtectedRoute permission="reports.view" user={user}>
                    <ReportsPage />
                  </ProtectedRoute>
                </Route>
                <Route path="/settings">
                  <ProtectedRoute permission="settings.view" user={user}>
                    <SettingsPage />
                  </ProtectedRoute>
                </Route>
                <Route path="/print-settings" component={PrintSettingsPage} />
                <Route path="/payment-methods" component={PaymentMethodsPage} />
                <Route path="/payment-types" component={PaymentTypesPage} />
                <Route path="/payment-terms" component={PaymentTermsPage} />
                <Route component={NotFound} />
              </Switch>
            </main>
          </div>
        </div>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;