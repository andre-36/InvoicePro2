import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { subDays, format } from "date-fns";
import { DateRange } from "react-day-picker";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { StatsCard } from "@/components/dashboard/stats-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { InvoiceStatusChart } from "@/components/dashboard/invoice-status-chart";
import { RecentInvoicesTable } from "@/components/dashboard/recent-invoices-table";
import { TopClientsList } from "@/components/dashboard/top-clients-list";


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
  // Initialize with last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  // Format dates for API queries
  const queryDates = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return {
        start: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd'),
      };
    }
    return {
      start: format(dateRange.from, 'yyyy-MM-dd'),
      end: format(dateRange.to, 'yyyy-MM-dd'),
    };
  }, [dateRange]);
  
  const { data, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ['/api/stores/1/dashboard/stats', queryDates],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('start', queryDates.start);
      params.set('end', queryDates.end);
      
      const response = await fetch(`/api/stores/1/dashboard/stats?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
  });
  
  
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <DateRangePicker
          date={dateRange}
          onDateChange={setDateRange}
          className="w-full sm:w-auto"
        />
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
        <RevenueChart startDate={queryDates.start} endDate={queryDates.end} />
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
