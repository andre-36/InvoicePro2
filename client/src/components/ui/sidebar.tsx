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
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
      await apiRequest("POST", "/api/logout", {});
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out border-r border-gray-200",
          mobileView ? (open ? "translate-x-0" : "-translate-x-full") : "translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo Section */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center">
              <FileText className="w-8 h-8 text-primary" />
              <span className="ml-2 text-xl font-semibold text-gray-800">InvoiceHub</span>
            </div>
            <button 
              className="md:hidden rounded-md p-2 text-gray-500 hover:text-gray-900 focus:outline-none"
              onClick={onToggle}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 pt-4 pb-4 overflow-y-auto">
            <div className="px-2 space-y-1">
              <Link href="/dashboard">
                <a 
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                    isActive("/dashboard") 
                      ? "text-white bg-primary" 
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  <BarChart2 className={cn(
                    "mr-3 h-5 w-5",
                    isActive("/dashboard") ? "text-white" : "text-gray-500 group-hover:text-gray-700"
                  )} />
                  <span>Dashboard</span>
                </a>
              </Link>
              
              <Link href="/invoices">
                <a 
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                    isActive("/invoices") 
                      ? "text-white bg-primary" 
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  <FileText className={cn(
                    "mr-3 h-5 w-5",
                    isActive("/invoices") ? "text-white" : "text-gray-500 group-hover:text-gray-700"
                  )} />
                  <span>Invoices</span>
                </a>
              </Link>
              
              <Link href="/clients">
                <a 
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                    isActive("/clients") 
                      ? "text-white bg-primary" 
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  <Users className={cn(
                    "mr-3 h-5 w-5",
                    isActive("/clients") ? "text-white" : "text-gray-500 group-hover:text-gray-700"
                  )} />
                  <span>Clients</span>
                </a>
              </Link>
              
              <Link href="/transactions">
                <a 
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                    isActive("/transactions") 
                      ? "text-white bg-primary" 
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  <DollarSign className={cn(
                    "mr-3 h-5 w-5",
                    isActive("/transactions") ? "text-white" : "text-gray-500 group-hover:text-gray-700"
                  )} />
                  <span>Transactions</span>
                </a>
              </Link>
              
              <Link href="/reports">
                <a 
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                    isActive("/reports") 
                      ? "text-white bg-primary" 
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  <PieChart className={cn(
                    "mr-3 h-5 w-5",
                    isActive("/reports") ? "text-white" : "text-gray-500 group-hover:text-gray-700"
                  )} />
                  <span>Reports</span>
                </a>
              </Link>
              
              <Link href="/products">
                <a 
                  className={cn(
                    "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                    isActive("/products") 
                      ? "text-white bg-primary" 
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  )}
                >
                  <Package2 className={cn(
                    "mr-3 h-5 w-5",
                    isActive("/products") ? "text-white" : "text-gray-500 group-hover:text-gray-700"
                  )} />
                  <span>Products</span>
                </a>
              </Link>
            </div>
            
            <div className="mt-8">
              <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Settings</h3>
              <div className="mt-2 px-2 space-y-1">
                <Link href="/settings">
                  <a 
                    className={cn(
                      "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                      isActive("/settings") 
                        ? "text-white bg-primary" 
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <Settings className={cn(
                      "mr-3 h-5 w-5",
                      isActive("/settings") ? "text-white" : "text-gray-500 group-hover:text-gray-700"
                    )} />
                    <span>General</span>
                  </a>
                </Link>
                
                <Link href="/settings/payment-methods">
                  <a 
                    className={cn(
                      "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                      isActive("/settings/payment-methods") 
                        ? "text-white bg-primary" 
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <CreditCard className={cn(
                      "mr-3 h-5 w-5",
                      isActive("/settings/payment-methods") ? "text-white" : "text-gray-500 group-hover:text-gray-700"
                    )} />
                    <span>Payment Methods</span>
                  </a>
                </Link>
                
                <Link href="/settings/account">
                  <a 
                    className={cn(
                      "flex items-center px-3 py-2.5 text-sm font-medium rounded-md group",
                      isActive("/settings/account") 
                        ? "text-white bg-primary" 
                        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <UserCog className={cn(
                      "mr-3 h-5 w-5",
                      isActive("/settings/account") ? "text-white" : "text-gray-500 group-hover:text-gray-700"
                    )} />
                    <span>Account</span>
                  </a>
                </Link>
              </div>
            </div>
          </nav>
          
          {/* User Profile Section */}
          <div className="flex items-center p-4 border-t border-gray-200">
            <div className="flex-shrink-0">
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-white">
                {user.fullName.charAt(0)}
              </div>
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-800 truncate">{user.fullName}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="ml-auto p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
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
