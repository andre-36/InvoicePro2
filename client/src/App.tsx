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
import ClientsPage from "@/pages/clients";
import CreateClientPage from "@/pages/clients/create";
import ProductsPage from "@/pages/products";
import ReportsPage from "@/pages/reports";
import SettingsPage from "@/pages/settings";
import { useMobile } from "./hooks/use-mobile";

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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    // Auto-login is still in progress or failed
    // For this demo, we'll just show a loading state since we're auto-logging in
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex h-screen overflow-hidden bg-gray-50">
        <Sidebar 
          user={user} 
          open={sidebarOpen} 
          onToggle={toggleSidebar}
          mobileView={isMobile}
        />
        
        <div className={`flex-1 flex flex-col overflow-hidden ${sidebarOpen && !isMobile ? 'ml-64' : 'ml-0'}`}>
          <Header toggleSidebar={toggleSidebar} />
          
          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
            <Switch>
              <Route path="/dashboard" component={Dashboard} />
              <Route path="/invoices" component={InvoicesPage} />
              <Route path="/invoices/create" component={CreateInvoicePage} />
              <Route path="/invoices/:id">
                {params => <InvoiceDetailPage id={parseInt(params.id)} />}
              </Route>
              <Route path="/clients" component={ClientsPage} />
              <Route path="/clients/create" component={CreateClientPage} />
              <Route path="/products" component={ProductsPage} />
              <Route path="/reports" component={ReportsPage} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
