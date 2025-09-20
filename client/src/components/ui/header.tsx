import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Menu,
  Search,
  Bell,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { ThemeToggle } from "@/components/theme-toggle";

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const [location] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const isInvoicesPage = location.startsWith("/invoices");

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left Side - Mobile Menu Toggle & Search */}
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="md:hidden p-2 mr-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="relative max-w-xs w-full hidden md:block">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary text-sm" 
              placeholder="Search..." 
            />
          </div>
        </div>
        
        {/* Right Side - Actions */}
        <div className="flex items-center space-x-3">
          <button className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none hidden md:block">
            <Search className="h-5 w-5 md:hidden" />
          </button>
          
          <button className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 focus:outline-none relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-amber-500"></span>
          </button>

          <ThemeToggle />
          
          <div className="relative">
            {isInvoicesPage ? (
              <Link href="/invoices/create">
                <Button 
                  className="hidden md:flex md:items-center md:justify-center"
                  size="sm"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  <span>New Invoice</span>
                </Button>
              </Link>
            ) : (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="hidden md:flex md:items-center md:justify-center"
                    size="sm"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    <span>New Invoice</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[90vh] p-0" aria-describedby="desktop-invoice-form-description">
                  <div className="overflow-auto h-full">
                    <div id="desktop-invoice-form-description" className="sr-only">Create a new invoice form</div>
                    <InvoiceForm onSuccess={() => setCreateDialogOpen(false)} />
                  </div>
                </DialogContent>
              </Dialog>
            )}
            
            {isInvoicesPage ? (
              <Link href="/invoices/create">
                <Button
                  size="sm"
                  className="md:hidden flex items-center justify-center w-10 h-10 rounded-md"
                >
                  <Plus className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="md:hidden flex items-center justify-center w-10 h-10 rounded-md"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[90vh] p-0" aria-describedby="mobile-invoice-form-description">
                  <div className="overflow-auto h-full">
                    <div id="mobile-invoice-form-description" className="sr-only">Create a new invoice form</div>
                    <InvoiceForm onSuccess={() => setCreateDialogOpen(false)} />
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
