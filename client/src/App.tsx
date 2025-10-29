import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";
import { apiRequest } from "./lib/queryClient";
import { Sidebar } from "@/components/ui/sidebar";
import { Header } from "@/components/ui/header";
import Dashboard from "@/pages/dashboard";
import InvoicesPage from "@/pages/invoices";
import InvoiceDetailPage from "@/pages/invoices/invoice-detail";
import CreateInvoicePage from "@/pages/invoices/create";
import QuotationsPage from "@/pages/quotations";
import QuotationDetailPage from "@/pages/quotations/quotation-detail";
import CreateQuotationPage from "@/pages/quotations/create";
import PurchaseOrdersPage from "@/pages/purchase-orders";
import CreatePurchaseOrderPage from "@/pages/purchase-orders/create";
import PurchaseOrderDetailPage from "@/pages/purchase-orders/purchase-order-detail";
import ClientsPage from "@/pages/clients";
import CreateClientPage from "@/pages/clients/create";
import ProductsPage from "@/pages/products";
import ProductDashboard from "@/pages/products/dashboard";
import CategoriesPage from "@/pages/categories";
import SuppliersPage from "@/pages/suppliers";
import TransactionsPage from "@/pages/transactions";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import PrintSettingsPage from "@/pages/print-settings";
import GeneralSettingsPage from "@/pages/general-settings";
import { useMobile } from "./hooks/use-mobile";
import { ThemeProvider } from "@/components/theme-provider";

type User = {
  id: number;
  username: string;
  fullName: string;
  email: string;
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useLocation();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  useEffect(() => {
    async function checkAuth() {
      try {
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
        } else {
          // Auto login for demo purposes - in a real application, we'd redirect to login
          try {
            const loginRes = await apiRequest('POST', '/api/auth/login', {
              username: 'admin',
              password: 'password'
            });
            
            if (loginRes.ok) {
              const userData = await loginRes.json();
              setUser(userData);
              
              // If we're at the root path, redirect to dashboard
              if (location === '/') {
                setLocation('/dashboard');
              }
            }
          } catch (error) {
            console.error('Auto login failed:', error);
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    }
    
    checkAuth();
  }, [location, setLocation]);

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

  if (!user) {
    // Auto-login is still in progress or failed
    // For this demo, we'll just show a loading state since we're auto-logging in
    return (
      <ThemeProvider defaultTheme="light" storageKey="aluminum-manager-theme">
        <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
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
            <Header toggleSidebar={toggleSidebar} />
            
            <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
              <Switch>
                <Route path="/dashboard" component={Dashboard} />
                <Route path="/invoices" component={InvoicesPage} />
                <Route path="/invoices/create" component={CreateInvoicePage} />
                <Route path="/invoices/:id">
                  {params => <InvoiceDetailPage id={parseInt(params.id)} />}
                </Route>
                <Route path="/quotations" component={QuotationsPage} />
                <Route path="/quotations/create" component={CreateQuotationPage} />
                <Route path="/quotations/:id">
                  {params => <QuotationDetailPage id={parseInt(params.id)} />}
                </Route>
                <Route path="/purchase-orders" component={PurchaseOrdersPage} />
                <Route path="/purchase-orders/create" component={CreatePurchaseOrderPage} />
                <Route path="/purchase-orders/:id">
                  {params => <PurchaseOrderDetailPage id={parseInt(params.id)} />}
                </Route>
                <Route path="/clients" component={ClientsPage} />
                <Route path="/clients/create" component={CreateClientPage} />
                <Route path="/products" component={ProductsPage} />
                <Route path="/products/:id/dashboard">
                  {params => <ProductDashboard id={parseInt(params.id)} />}
                </Route>
                <Route path="/categories" component={CategoriesPage} />
                <Route path="/suppliers" component={SuppliersPage} />
                <Route path="/transactions" component={TransactionsPage} />
                <Route path="/reports" component={ReportsPage} />
                <Route path="/settings" component={SettingsPage} />
                <Route path="/print-settings" component={PrintSettingsPage} />
                <Route path="/general-settings" component={GeneralSettingsPage} />
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
