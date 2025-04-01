import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { InvoiceStatusChart } from "@/components/dashboard/invoice-status-chart";
import { RecentInvoicesTable } from "@/components/dashboard/recent-invoices-table";
import { TopClientsList } from "@/components/dashboard/top-clients-list";

type DateRange = "this_month" | "last_month" | "this_quarter" | "this_year" | "custom";

type DashboardStats = {
  totalIncome: number;
  totalExpenses: number;
  openInvoices: {
    count: number;
    value: number;
  };
  totalClients: number;
};

export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange>("this_month");
  
  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['/api/dashboard/stats'],
  });
  
  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };
  
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="inline-flex items-center rounded-md">
          <Select
            value={dateRange}
            onValueChange={(value) => setDateRange(value as DateRange)}
          >
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="This Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_quarter">This Quarter</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {isLoading ? (
          // Loading state for stats cards
          Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : error || !data ? (
          // Error state
          <div className="col-span-4">
            <Card>
              <CardContent className="p-5 text-center">
                <p className="text-gray-500">Failed to load dashboard statistics</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          // Stats cards with data
          <>
            <StatsCard
              title="Total Income"
              value={data.totalIncome}
              change={{
                value: 2567,
                percentage: 12.5,
                positive: true
              }}
              status={{
                label: "12.5%",
                color: "green"
              }}
            />
            
            <StatsCard
              title="Total Expenses"
              value={data.totalExpenses}
              change={{
                value: 945,
                percentage: 8.2,
                positive: false
              }}
              status={{
                label: "8.2%",
                color: "red"
              }}
            />
            
            <StatsCard
              title="Open Invoices"
              value={data.openInvoices.count}
              secondaryText="invoices"
              status={{
                label: "Pending",
                color: "yellow"
              }}
              change={{
                value: formatCurrency(data.openInvoices.value),
                percentage: 0,
                positive: true
              }}
            />
            
            <StatsCard
              title="Total Clients"
              value={data.totalClients}
              secondaryText="clients"
              change={{
                value: 2,
                percentage: 4.3,
                positive: true
              }}
              status={{
                label: "4.3%",
                color: "blue"
              }}
            />
          </>
        )}
      </div>
      
      {/* Charts and Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <RevenueChart />
        <InvoiceStatusChart />
      </div>
      
      {/* Recent Invoices & Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <RecentInvoicesTable />
        <TopClientsList />
      </div>
    </div>
  );
}
