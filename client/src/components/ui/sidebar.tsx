import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart2,
  FileText,
  Users,
  DollarSign,
  PieChart,
  Package2,
  Settings,
  UserCog,
  CreditCard,
  LogOut,
  Menu,
  FileEdit,
  Bell,
  Package,
  Building2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";

interface SidebarProps {
  user: {
    fullName: string;
    email: string;
  };
  open: boolean;
  onToggle: () => void;
  mobileView: boolean;
}

export function Sidebar({ user, open, onToggle, mobileView }: SidebarProps) {
  const [location] = useLocation();
  const { toast } = useToast();

  const isActive = (path: string) => {
    return location === path;
  };

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout", {});
      window.location.reload();
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "There was an error logging out. Please try again.",
        variant: "destructive",
      });
    }
  };

  // If mobile and sidebar is closed, don't render sidebar
  if (mobileView && !open) {
    return (
      <>
        {open && (
          <div 
            className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50 md:hidden"
            onClick={onToggle}
          ></div>
        )}
      </>
    );
  }

  return (
    <>
      {mobileView && open && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50 md:hidden"
          onClick={onToggle}
        ></div>
      )}
      <div 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-background dark:bg-card shadow-lg transform transition-transform duration-300 ease-in-out border-r border-border",
          mobileView ? (open ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-border">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-primary" />
              <span className="ml-2 text-xl font-semibold text-foreground">InvoiceHub</span>
            </div>
            <div className="flex items-center space-x-2">
              {/* Notifications */}
              <button className="p-1.5 text-muted-foreground hover:text-foreground focus:outline-none relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-amber-500"></span>
              </button>
              
              {/* Dark Mode Toggle */}
              <ThemeToggle />
              
              {/* Mobile Menu Toggle */}
              <button 
                className="md:hidden rounded-md p-2 text-muted-foreground hover:text-foreground focus:outline-none"
                onClick={onToggle}
              >
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 pt-4 pb-4 overflow-y-auto">
            <div className="px-2 space-y-1">
              <Link 
                href="/dashboard"
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                  isActive("/dashboard") 
                    ? "text-primary-foreground bg-primary" 
                    : "text-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <BarChart2 className={cn(
                  "mr-3 h-5 w-5",
                  isActive("/dashboard") ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>Dashboard</span>
              </Link>
              
              <Link 
                href="/invoices"
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                  isActive("/invoices") 
                    ? "text-primary-foreground bg-primary" 
                    : "text-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <FileText className={cn(
                  "mr-3 h-5 w-5",
                  isActive("/invoices") ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>Invoices</span>
              </Link>
              
              <Link 
                href="/quotations"
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                  isActive("/quotations") 
                    ? "text-primary-foreground bg-primary" 
                    : "text-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <FileEdit className={cn(
                  "mr-3 h-5 w-5",
                  isActive("/quotations") ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>Quotations</span>
              </Link>
              
              <Link 
                href="/clients"
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                  isActive("/clients") 
                    ? "text-primary-foreground bg-primary" 
                    : "text-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Users className={cn(
                  "mr-3 h-5 w-5",
                  isActive("/clients") ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>Clients</span>
              </Link>
              
              <Link 
                href="/transactions"
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                  isActive("/transactions") 
                    ? "text-primary-foreground bg-primary" 
                    : "text-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <DollarSign className={cn(
                  "mr-3 h-5 w-5",
                  isActive("/transactions") ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>Transactions</span>
              </Link>
              
              <Link 
                href="/reports"
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                  isActive("/reports") 
                    ? "text-primary-foreground bg-primary" 
                    : "text-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <PieChart className={cn(
                  "mr-3 h-5 w-5",
                  isActive("/reports") ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>Reports</span>
              </Link>
              
              <Link 
                href="/products"
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                  isActive("/products") 
                    ? "text-primary-foreground bg-primary" 
                    : "text-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Package2 className={cn(
                  "mr-3 h-5 w-5",
                  isActive("/products") ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>Products</span>
              </Link>

              <Link 
                href="/suppliers"
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                  isActive("/suppliers") 
                    ? "text-primary-foreground bg-primary" 
                    : "text-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Building2 className={cn(
                  "mr-3 h-5 w-5",
                  isActive("/suppliers") ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>Suppliers</span>
              </Link>
              
              <Link 
                href="/purchase-orders"
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                  isActive("/purchase-orders") 
                    ? "text-primary-foreground bg-primary" 
                    : "text-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <Package className={cn(
                  "mr-3 h-5 w-5",
                  isActive("/purchase-orders") ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <span>Purchase Orders</span>
              </Link>
            </div>
            
            <div className="mt-8">
              <h3 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settings</h3>
              <div className="mt-2 px-2 space-y-1">
                <Link 
                  href="/settings"
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                    isActive("/settings") 
                      ? "text-primary-foreground bg-primary" 
                      : "text-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Settings className={cn(
                    "mr-3 h-5 w-5",
                    isActive("/settings") ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span>General</span>
                </Link>
              </div>
            </div>
          </nav>
          
          {/* User Profile Section */}
          <div className="flex items-center p-4 border-t border-border">
            <div className="flex-shrink-0">
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                {user.fullName.charAt(0)}
              </div>
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-foreground truncate">{user.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="ml-auto p-1 text-muted-foreground hover:text-foreground focus:outline-none"
              aria-label="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
