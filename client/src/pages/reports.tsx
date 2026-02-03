
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, ComposedChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, DollarSign, CreditCard, Users, Package, FileText, ArrowUpRight, ArrowDownRight, Wallet, Receipt, Calendar as CalendarIcon, Banknote } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { DateRange as DayPickerDateRange } from "react-day-picker";
import { Progress } from "@/components/ui/progress";
import type { CashAccount, InflowCategory, OutflowCategory } from "@shared/schema";

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

type DateRange = "this_month" | "last_month" | "this_quarter" | "this_year" | "custom";

type SummaryReport = {
  totalSales: number;
  totalReceived: number;
  totalReceivables: number;
  totalPayables: number;
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  estimatedProfit: number;
  profitMargin: number;
  invoiceCount: number;
  monthlyTrend: Array<{
    month: string;
    sales: number;
    expenses: number;
    profit: number;
  }>;
};

type FinancialReport = {
  revenue: {
    salesRevenue: number;
    otherIncome: number;
    totalRevenue: number;
  };
  cogs: {
    beginningInventory: number;
    purchases: number;
    endingInventory: number;
    totalCOGS: number;
  };
  expenses: {
    operatingExpenses: number;
    otherExpenses: number;
    totalExpenses: number;
  };
  profit: {
    grossProfit: number;
    netProfit: number;
    grossProfitMargin: number;
    netProfitMargin: number;
  };
};

type CashFlowReport = {
  operating: {
    cashFromSales: number;
    cashPaidToSuppliers: number;
    cashPaidForExpenses: number;
    netOperatingCashFlow: number;
  };
  investing: {
    equipmentPurchases: number;
    netInvestingCashFlow: number;
  };
  financing: {
    ownerInvestment: number;
    netFinancingCashFlow: number;
  };
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
};

type ProductReport = {
  topProducts: Array<{
    productId: number;
    name: string;
    quantitySold: number;
    revenue: number;
    avgPrice: number;
  }>;
  totalProductsSold: number;
  totalRevenue: number;
  totalQuantity: number;
  categoryBreakdown: Array<{ name: string; value: number }>;
};

type CustomerReport = {
  topCustomers: Array<{
    clientId: number;
    name: string;
    invoiceCount: number;
    totalPurchase: number;
    totalPaid: number;
    outstanding: number;
    lastPurchaseDate: string | null;
  }>;
  highestReceivables: Array<{
    clientId: number;
    name: string;
    outstanding: number;
  }>;
  totalCustomers: number;
  totalReceivables: number;
  avgPurchasePerCustomer: number;
};

type Transaction = {
  id: number;
  description: string;
  amount: string;
  date: string;
  type: 'income' | 'expense';
  category: string | null;
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("summary");
  const [dateRange, setDateRange] = useState<DateRange>("this_month");
  const [customDateRange, setCustomDateRange] = useState<DayPickerDateRange | undefined>(undefined);
  const [isCustomOpen, setIsCustomOpen] = useState(false);
  
  const getApiDateRange = () => {
    if (dateRange === "custom" && customDateRange?.from && customDateRange?.to) {
      const fromStr = format(customDateRange.from, "yyyy-MM-dd");
      const toStr = format(customDateRange.to, "yyyy-MM-dd");
      return `custom:${fromStr}:${toStr}`;
    }
    return dateRange;
  };

  const apiDateRange = getApiDateRange();

  // Summary Dashboard data
  const { data: summaryReport, isLoading: isLoadingSummary } = useQuery<SummaryReport>({
    queryKey: ['/api/stores/1/reports/summary', apiDateRange],
    queryFn: async () => {
      const response = await fetch(`/api/stores/1/reports/summary?dateRange=${encodeURIComponent(apiDateRange)}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch summary report');
      return response.json();
    },
  });
  
  // Financial Report data
  const { data: financialReport, isLoading: isLoadingFinancial } = useQuery<FinancialReport>({
    queryKey: ['/api/stores/1/reports/financial', apiDateRange],
    queryFn: async () => {
      const response = await fetch(`/api/stores/1/reports/financial?dateRange=${encodeURIComponent(apiDateRange)}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch financial report');
      return response.json();
    },
  });
  
  // Cash Flow Report data
  const { data: cashFlowReport, isLoading: isLoadingCashFlow } = useQuery<CashFlowReport>({
    queryKey: ['/api/stores/1/reports/cashflow', apiDateRange],
    queryFn: async () => {
      const response = await fetch(`/api/stores/1/reports/cashflow?dateRange=${encodeURIComponent(apiDateRange)}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch cashflow report');
      return response.json();
    },
  });

  // Product Performance data
  const { data: productReport, isLoading: isLoadingProducts } = useQuery<ProductReport>({
    queryKey: ['/api/stores/1/reports/products', apiDateRange],
    queryFn: async () => {
      const response = await fetch(`/api/stores/1/reports/products?dateRange=${encodeURIComponent(apiDateRange)}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch product report');
      return response.json();
    },
  });

  // Customer Report data
  const { data: customerReport, isLoading: isLoadingCustomers } = useQuery<CustomerReport>({
    queryKey: ['/api/stores/1/reports/customers', apiDateRange],
    queryFn: async () => {
      const response = await fetch(`/api/stores/1/reports/customers?dateRange=${encodeURIComponent(apiDateRange)}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch customer report');
      return response.json();
    },
  });
  
  // Transactions for detailed breakdown
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/stores/1/transactions', apiDateRange],
    queryFn: async () => {
      const response = await fetch(`/api/stores/1/transactions?dateRange=${encodeURIComponent(apiDateRange)}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch transactions');
      return response.json();
    },
  });
  
  // Cash accounts for Cash Daily Report
  const { data: cashAccounts } = useQuery<CashAccount[]>({
    queryKey: ['/api/stores/1/cash-accounts'],
  });

  // Fetch inflow categories from settings
  const { data: inflowCategories } = useQuery<InflowCategory[]>({
    queryKey: ['/api/stores/1/inflow-categories'],
  });

  // Fetch outflow categories from settings
  const { data: outflowCategories } = useQuery<OutflowCategory[]>({
    queryKey: ['/api/stores/1/outflow-categories'],
  });

  // Process transaction data for charts - now using categories from settings
  const processTransactionsByCategory = (type: 'income' | 'expense') => {
    if (!transactions) return [];
    
    const filteredTransactions = transactions.filter(t => t.type === type);
    
    // Get category names from settings (use normalized lowercase for matching)
    const settingsCategories = type === 'income' 
      ? (inflowCategories || []).filter(c => c.isActive).map(c => c.name)
      : (outflowCategories || []).filter(c => c.isActive).map(c => c.name);
    
    // Create mapping for case-insensitive category matching
    const categoryNameMap: Record<string, string> = {};
    settingsCategories.forEach(name => {
      categoryNameMap[name.toLowerCase().trim()] = name;
    });
    
    // Initialize all categories from settings with 0 value
    const categoryTotals: Record<string, number> = {};
    settingsCategories.forEach(name => {
      categoryTotals[name] = 0;
    });
    // Add "Lain-lain" for uncategorized transactions
    categoryTotals['Lain-lain'] = 0;
    
    // Sum up transaction amounts per category (with normalization)
    filteredTransactions.forEach(transaction => {
      const rawCategory = transaction.category?.trim() || '';
      const normalizedKey = rawCategory.toLowerCase();
      
      // Try to match with settings category (case-insensitive)
      const matchedCategory = categoryNameMap[normalizedKey] || 
        (rawCategory && categoryTotals[rawCategory] !== undefined ? rawCategory : 'Lain-lain');
      
      categoryTotals[matchedCategory] += parseFloat(transaction.amount);
    });
    
    // Convert to array - show ALL categories from settings (including 0 value)
    // Filter out only "Lain-lain" if it has 0 value
    return Object.entries(categoryTotals)
      .filter(([name, value]) => name !== 'Lain-lain' || value > 0)
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2))
      }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
  };
  
  const incomeByCategory = processTransactionsByCategory('income');
  const expensesByCategory = processTransactionsByCategory('expense');

  // Process cash daily report data
  const processCashDailyReport = () => {
    if (!transactions || !cashAccounts) return { byDate: [], byAccount: [], totals: { income: 0, expense: 0, net: 0 } };
    
    // Filter transactions that have a cash account
    const cashTransactions = transactions.filter(t => t.accountId !== null);
    
    // Group by date
    const byDateMap: Record<string, { date: string; income: number; expense: number; transactions: typeof cashTransactions }> = {};
    
    cashTransactions.forEach(t => {
      if (!byDateMap[t.date]) {
        byDateMap[t.date] = { date: t.date, income: 0, expense: 0, transactions: [] };
      }
      const amount = parseFloat(t.amount);
      if (t.type === 'income') {
        byDateMap[t.date].income += amount;
      } else {
        byDateMap[t.date].expense += amount;
      }
      byDateMap[t.date].transactions.push(t);
    });
    
    const byDate = Object.values(byDateMap).sort((a, b) => b.date.localeCompare(a.date));
    
    // Group by cash account
    const byAccountMap: Record<number, { accountId: number; accountName: string; income: number; expense: number }> = {};
    
    cashTransactions.forEach(t => {
      const accountId = t.accountId!;
      if (!byAccountMap[accountId]) {
        const account = cashAccounts.find(a => a.id === accountId);
        byAccountMap[accountId] = { 
          accountId, 
          accountName: account?.name || 'Unknown', 
          income: 0, 
          expense: 0 
        };
      }
      const amount = parseFloat(t.amount);
      if (t.type === 'income') {
        byAccountMap[accountId].income += amount;
      } else {
        byAccountMap[accountId].expense += amount;
      }
    });
    
    const byAccount = Object.values(byAccountMap);
    
    // Calculate totals
    const totals = {
      income: cashTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0),
      expense: cashTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0),
      net: 0
    };
    totals.net = totals.income - totals.expense;
    
    return { byDate, byAccount, totals };
  };
  
  const cashDailyReport = processCashDailyReport();
  
  const getCashAccountName = (accountId: number | null | undefined) => {
    if (!accountId || !cashAccounts) return '-';
    const account = cashAccounts.find(a => a.id === accountId);
    return account?.name || '-';
  };

  const downloadReport = async (reportType: string) => {
    const tabToEndpoint: Record<string, string> = {
      'summary': 'summary',
      'profit-loss': 'financial',
      'cash-flow': 'cashflow',
      'products': 'products',
      'customers': 'customers',
      'breakdown': 'breakdown'
    };
    
    const endpoint = tabToEndpoint[reportType] || reportType;
    
    try {
      const response = await fetch(`/api/stores/1/reports/${endpoint}/export?dateRange=${encodeURIComponent(apiDateRange)}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan-${endpoint}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        alert('Export untuk laporan ini belum tersedia');
      }
    } catch (error) {
      console.error(`Error downloading ${reportType} report:`, error);
      alert('Gagal mengunduh laporan');
    }
  };

  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon: Icon, 
    trend, 
    trendValue,
    color = "blue"
  }: { 
    title: string; 
    value: string; 
    subtitle?: string; 
    icon: any; 
    trend?: 'up' | 'down';
    trendValue?: string;
    color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      red: 'bg-red-50 text-red-600',
      yellow: 'bg-yellow-50 text-yellow-600',
      purple: 'bg-purple-50 text-purple-600'
    };
    
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-500">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
              {trend && trendValue && (
                <div className={`flex items-center text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                  {trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                  {trendValue}
                </div>
              )}
            </div>
            <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Keuangan</h1>
          <p className="text-sm text-gray-500 mt-1">Pantau kesehatan keuangan bisnis Anda dengan mudah</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <Select
            value={dateRange}
            onValueChange={(value) => {
              setDateRange(value as DateRange);
              if (value === "custom") {
                setIsCustomOpen(true);
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Bulan Ini" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">Bulan Ini</SelectItem>
              <SelectItem value="last_month">Bulan Lalu</SelectItem>
              <SelectItem value="this_quarter">Kuartal Ini</SelectItem>
              <SelectItem value="this_year">Tahun Ini</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRange === "custom" && (
            <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customDateRange?.from ? (
                    customDateRange.to ? (
                      <>
                        {format(customDateRange.from, "dd MMM yyyy", { locale: id })} - {format(customDateRange.to, "dd MMM yyyy", { locale: id })}
                      </>
                    ) : (
                      format(customDateRange.from, "dd MMM yyyy", { locale: id })
                    )
                  ) : (
                    <span className="text-muted-foreground">Pilih tanggal...</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={customDateRange?.from}
                  selected={customDateRange}
                  onSelect={setCustomDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
          
          <Button variant="outline" onClick={() => downloadReport(activeTab)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <Tabs
        defaultValue="summary"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="summary">Ringkasan</TabsTrigger>
          <TabsTrigger value="profit-loss">Laba Rugi</TabsTrigger>
          <TabsTrigger value="cash-flow">Arus Kas</TabsTrigger>
          <TabsTrigger value="cash-daily">Kas Harian</TabsTrigger>
          <TabsTrigger value="products">Performa Produk</TabsTrigger>
          <TabsTrigger value="customers">Pelanggan</TabsTrigger>
          <TabsTrigger value="breakdown">Rincian</TabsTrigger>
        </TabsList>

        {/* RINGKASAN DASHBOARD */}
        <TabsContent value="summary" className="space-y-6">
          {isLoadingSummary ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-[130px]" />
              ))}
            </div>
          ) : summaryReport ? (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Penjualan"
                  value={formatCurrency(summaryReport.totalSales)}
                  subtitle={`${summaryReport.invoiceCount} invoice`}
                  icon={Receipt}
                  color="blue"
                />
                <StatCard
                  title="Uang Masuk"
                  value={formatCurrency(summaryReport.totalIncome)}
                  subtitle="Dari pembayaran"
                  icon={TrendingUp}
                  color="green"
                />
                <StatCard
                  title="Uang Keluar"
                  value={formatCurrency(summaryReport.totalExpense)}
                  subtitle="Biaya operasional"
                  icon={TrendingDown}
                  color="red"
                />
                <StatCard
                  title="Arus Kas Bersih"
                  value={formatCurrency(summaryReport.netCashFlow)}
                  subtitle={summaryReport.netCashFlow >= 0 ? "Positif" : "Negatif"}
                  icon={Wallet}
                  color={summaryReport.netCashFlow >= 0 ? "green" : "red"}
                />
              </div>

              {/* Receivables & Payables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-yellow-600" />
                      Piutang (Belum Dibayar Pelanggan)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-yellow-600">{formatCurrency(summaryReport.totalReceivables)}</p>
                    <p className="text-sm text-gray-500 mt-1">Total yang harus ditagih dari pelanggan</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-red-600" />
                      Hutang (Belum Dibayar ke Supplier)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(summaryReport.totalPayables)}</p>
                    <p className="text-sm text-gray-500 mt-1">Total yang harus dibayar ke supplier</p>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Trend Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Tren 6 Bulan Terakhir</CardTitle>
                  <CardDescription>Perbandingan penjualan, pengeluaran, dan keuntungan</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={summaryReport.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`} />
                        <Tooltip formatter={(value) => formatCurrency(typeof value === 'number' ? value : 0)} />
                        <Legend />
                        <Bar dataKey="sales" name="Penjualan" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expenses" name="Pengeluaran" fill="#EF4444" radius={[4, 4, 0, 0]} />
                        <Line type="monotone" dataKey="profit" name="Keuntungan" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Health Check */}
              <Card>
                <CardHeader>
                  <CardTitle>Kesehatan Keuangan</CardTitle>
                  <CardDescription>Indikator sederhana kondisi bisnis Anda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Rasio Pembayaran Pelanggan</span>
                      <span className="font-medium">
                        {summaryReport.totalSales > 0 
                          ? ((summaryReport.totalReceived / summaryReport.totalSales) * 100).toFixed(0)
                          : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={summaryReport.totalSales > 0 
                        ? (summaryReport.totalReceived / summaryReport.totalSales) * 100 
                        : 0} 
                      className="h-2"
                    />
                    <p className="text-xs text-gray-500">Berapa persen penjualan yang sudah dibayar</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Margin Keuntungan</span>
                      <span className="font-medium">{summaryReport.profitMargin.toFixed(1)}%</span>
                    </div>
                    <Progress 
                      value={Math.min(Math.max(summaryReport.profitMargin, 0), 100)} 
                      className="h-2"
                    />
                    <p className="text-xs text-gray-500">Keuntungan bersih dari total penjualan</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex justify-center items-center h-[400px]">
              <p className="text-gray-500">Tidak ada data untuk ditampilkan</p>
            </div>
          )}
        </TabsContent>
        
        {/* LAPORAN LABA RUGI */}
        <TabsContent value="profit-loss" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Laporan Laba Rugi (Income Statement)</CardTitle>
              <CardDescription>Ringkasan pendapatan, beban, dan laba bersih</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingFinancial ? (
                <Skeleton className="h-[500px] w-full" />
              ) : !financialReport ? (
                <div className="flex justify-center items-center h-[400px]">
                  <p className="text-gray-500">Failed to load financial report</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Revenue Section */}
                  <div className="border rounded-lg p-4 bg-green-50">
                    <h3 className="font-semibold text-lg mb-3">PENDAPATAN</h3>
                    <div className="space-y-2 ml-4">
                      <div className="flex justify-between">
                        <span>Pendapatan Penjualan</span>
                        <span className="font-medium">{formatCurrency(financialReport.revenue.salesRevenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pendapatan Lain-lain</span>
                        <span className="font-medium">{formatCurrency(financialReport.revenue.otherIncome)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-semibold text-green-700">
                        <span>Total Pendapatan</span>
                        <span>{formatCurrency(financialReport.revenue.totalRevenue)}</span>
                      </div>
                    </div>
                  </div>

                  {/* COGS Section */}
                  <div className="border rounded-lg p-4 bg-yellow-50">
                    <h3 className="font-semibold text-lg mb-3">HARGA POKOK PENJUALAN (HPP)</h3>
                    <div className="space-y-2 ml-4">
                      <div className="flex justify-between">
                        <span>Persediaan Awal</span>
                        <span className="font-medium">{formatCurrency(financialReport.cogs.beginningInventory)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Pembelian</span>
                        <span className="font-medium">{formatCurrency(financialReport.cogs.purchases)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Persediaan Akhir</span>
                        <span className="font-medium">({formatCurrency(financialReport.cogs.endingInventory)})</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-semibold text-yellow-700">
                        <span>Total HPP</span>
                        <span>{formatCurrency(financialReport.cogs.totalCOGS)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Gross Profit */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <div className="flex justify-between text-lg font-semibold text-blue-700">
                      <span>LABA KOTOR</span>
                      <span>{formatCurrency(financialReport.profit.grossProfit)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Margin: {financialReport.profit.grossProfitMargin.toFixed(2)}%
                    </p>
                  </div>

                  {/* Expenses Section */}
                  <div className="border rounded-lg p-4 bg-red-50">
                    <h3 className="font-semibold text-lg mb-3">BEBAN OPERASIONAL</h3>
                    <div className="space-y-2 ml-4">
                      <div className="flex justify-between">
                        <span>Beban Operasional</span>
                        <span className="font-medium">{formatCurrency(financialReport.expenses.operatingExpenses)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Beban Lain-lain</span>
                        <span className="font-medium">{formatCurrency(financialReport.expenses.otherExpenses)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-semibold text-red-700">
                        <span>Total Beban</span>
                        <span>{formatCurrency(financialReport.expenses.totalExpenses)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Profit */}
                  <div className="border-2 rounded-lg p-4 bg-indigo-50 border-indigo-300">
                    <div className="flex justify-between text-xl font-bold text-indigo-700">
                      <span>LABA BERSIH</span>
                      <span>{formatCurrency(financialReport.profit.netProfit)}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Margin Laba Bersih: {financialReport.profit.netProfitMargin.toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* LAPORAN ARUS KAS */}
        <TabsContent value="cash-flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Laporan Arus Kas (Cash Flow Statement)</CardTitle>
              <CardDescription>Analisis pergerakan kas masuk dan keluar</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCashFlow ? (
                <Skeleton className="h-[500px] w-full" />
              ) : !cashFlowReport ? (
                <div className="flex justify-center items-center h-[400px]">
                  <p className="text-gray-500">Failed to load cash flow report</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Operating Activities */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <h3 className="font-semibold text-lg mb-3">AKTIVITAS OPERASIONAL</h3>
                    <div className="space-y-2 ml-4">
                      <div className="flex justify-between">
                        <span>Kas dari Penjualan</span>
                        <span className="font-medium text-green-600">{formatCurrency(cashFlowReport.operating.cashFromSales)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kas Dibayar ke Supplier</span>
                        <span className="font-medium text-red-600">({formatCurrency(cashFlowReport.operating.cashPaidToSuppliers)})</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kas Dibayar untuk Beban</span>
                        <span className="font-medium text-red-600">({formatCurrency(cashFlowReport.operating.cashPaidForExpenses)})</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-semibold text-blue-700">
                        <span>Kas Bersih dari Operasional</span>
                        <span>{formatCurrency(cashFlowReport.operating.netOperatingCashFlow)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Investing Activities */}
                  <div className="border rounded-lg p-4 bg-purple-50">
                    <h3 className="font-semibold text-lg mb-3">AKTIVITAS INVESTASI</h3>
                    <div className="space-y-2 ml-4">
                      <div className="flex justify-between">
                        <span>Pembelian Peralatan</span>
                        <span className="font-medium text-red-600">({formatCurrency(cashFlowReport.investing.equipmentPurchases)})</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-semibold text-purple-700">
                        <span>Kas Bersih dari Investasi</span>
                        <span>{formatCurrency(cashFlowReport.investing.netInvestingCashFlow)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financing Activities */}
                  <div className="border rounded-lg p-4 bg-green-50">
                    <h3 className="font-semibold text-lg mb-3">AKTIVITAS PENDANAAN</h3>
                    <div className="space-y-2 ml-4">
                      <div className="flex justify-between">
                        <span>Investasi Pemilik</span>
                        <span className="font-medium text-green-600">{formatCurrency(cashFlowReport.financing.ownerInvestment)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t font-semibold text-green-700">
                        <span>Kas Bersih dari Pendanaan</span>
                        <span>{formatCurrency(cashFlowReport.financing.netFinancingCashFlow)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Net Cash Flow Summary */}
                  <div className="border-2 rounded-lg p-4 bg-indigo-50 border-indigo-300">
                    <div className="space-y-2">
                      <div className="flex justify-between font-semibold">
                        <span>Kenaikan (Penurunan) Kas Bersih</span>
                        <span className={cashFlowReport.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(cashFlowReport.netCashFlow)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Kas Awal Periode</span>
                        <span>{formatCurrency(cashFlowReport.beginningCash)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t text-xl font-bold text-indigo-700">
                        <span>Kas Akhir Periode</span>
                        <span>{formatCurrency(cashFlowReport.endingCash)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Per-Account Breakdown */}
                  {cashFlowReport.accountBreakdown && cashFlowReport.accountBreakdown.length > 0 && (
                    <div className="border rounded-lg p-4 bg-white">
                      <h3 className="font-semibold text-lg mb-4">RINCIAN PER REKENING KAS</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-gray-50">
                              <th className="text-left py-2 px-3">Rekening</th>
                              <th className="text-right py-2 px-3">Saldo Awal</th>
                              <th className="text-right py-2 px-3">Kas Masuk</th>
                              <th className="text-right py-2 px-3">Kas Keluar</th>
                              <th className="text-right py-2 px-3">Saldo Akhir</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cashFlowReport.accountBreakdown.map((account: any) => (
                              <tr key={account.id} className="border-b hover:bg-gray-50">
                                <td className="py-2 px-3 font-medium">{account.name}</td>
                                <td className="py-2 px-3 text-right">{formatCurrency(account.openingBalance)}</td>
                                <td className="py-2 px-3 text-right text-green-600">{formatCurrency(account.inflow)}</td>
                                <td className="py-2 px-3 text-right text-red-600">({formatCurrency(account.outflow)})</td>
                                <td className="py-2 px-3 text-right font-semibold">{formatCurrency(account.closingBalance)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-indigo-50 font-bold">
                              <td className="py-2 px-3">TOTAL</td>
                              <td className="py-2 px-3 text-right">{formatCurrency(cashFlowReport.beginningCash)}</td>
                              <td className="py-2 px-3 text-right text-green-600">
                                {formatCurrency(cashFlowReport.accountBreakdown.reduce((sum: number, a: any) => sum + a.inflow, 0))}
                              </td>
                              <td className="py-2 px-3 text-right text-red-600">
                                ({formatCurrency(cashFlowReport.accountBreakdown.reduce((sum: number, a: any) => sum + a.outflow, 0))})
                              </td>
                              <td className="py-2 px-3 text-right">{formatCurrency(cashFlowReport.endingCash)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LAPORAN KAS HARIAN */}
        <TabsContent value="cash-daily" className="space-y-4">
          {isLoadingTransactions ? (
            <Skeleton className="h-[600px] w-full" />
          ) : (
            <>
              {/* Cash Daily Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ArrowUpRight className="h-5 w-5 text-green-600" />
                      Total Kas Masuk
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(cashDailyReport.totals.income)}</p>
                    <p className="text-sm text-gray-500 mt-1">Periode yang dipilih</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <ArrowDownRight className="h-5 w-5 text-red-600" />
                      Total Kas Keluar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-600">{formatCurrency(cashDailyReport.totals.expense)}</p>
                    <p className="text-sm text-gray-500 mt-1">Periode yang dipilih</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Banknote className="h-5 w-5 text-indigo-600" />
                      Selisih Kas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${cashDailyReport.totals.net >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                      {formatCurrency(cashDailyReport.totals.net)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Kas Masuk - Kas Keluar</p>
                  </CardContent>
                </Card>
              </div>

              {/* Per Account Summary */}
              {cashDailyReport.byAccount.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wallet className="h-5 w-5" />
                      Ringkasan Per Akun Kas
                    </CardTitle>
                    <CardDescription>Rincian kas masuk dan keluar per akun</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Akun Kas</TableHead>
                          <TableHead className="text-right">Kas Masuk</TableHead>
                          <TableHead className="text-right">Kas Keluar</TableHead>
                          <TableHead className="text-right">Selisih</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cashDailyReport.byAccount.map((account) => (
                          <TableRow key={account.accountId}>
                            <TableCell className="font-medium">{account.accountName}</TableCell>
                            <TableCell className="text-right text-green-600">{formatCurrency(account.income)}</TableCell>
                            <TableCell className="text-right text-red-600">{formatCurrency(account.expense)}</TableCell>
                            <TableCell className={`text-right font-semibold ${account.income - account.expense >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                              {formatCurrency(account.income - account.expense)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Daily Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Rincian Kas Harian
                  </CardTitle>
                  <CardDescription>Detail transaksi kas per tanggal untuk rekonsiliasi laci kasir</CardDescription>
                </CardHeader>
                <CardContent>
                  {cashDailyReport.byDate.length === 0 ? (
                    <div className="flex justify-center items-center h-[200px]">
                      <p className="text-gray-500">Tidak ada transaksi kas pada periode ini</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cashDailyReport.byDate.map((day) => (
                        <div key={day.date} className="border rounded-lg overflow-hidden">
                          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                            <div className="font-semibold">
                              {format(new Date(day.date), 'EEEE, dd MMMM yyyy', { locale: id })}
                            </div>
                            <div className="flex gap-4 text-sm">
                              <span className="text-green-600">Masuk: {formatCurrency(day.income)}</span>
                              <span className="text-red-600">Keluar: {formatCurrency(day.expense)}</span>
                              <span className={`font-semibold ${day.income - day.expense >= 0 ? 'text-indigo-600' : 'text-red-600'}`}>
                                Selisih: {formatCurrency(day.income - day.expense)}
                              </span>
                            </div>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Deskripsi</TableHead>
                                <TableHead>Kategori</TableHead>
                                <TableHead>Akun Kas</TableHead>
                                <TableHead>Referensi</TableHead>
                                <TableHead className="text-right">Jumlah</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {day.transactions.map((t) => (
                                <TableRow key={t.id}>
                                  <TableCell>{t.description}</TableCell>
                                  <TableCell>{t.category || '-'}</TableCell>
                                  <TableCell>{getCashAccountName(t.accountId)}</TableCell>
                                  <TableCell className="text-gray-500">{t.referenceNumber || '-'}</TableCell>
                                  <TableCell className={`text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(parseFloat(t.amount))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* LAPORAN PERFORMA PRODUK */}
        <TabsContent value="products" className="space-y-4">
          {isLoadingProducts ? (
            <Skeleton className="h-[600px] w-full" />
          ) : productReport ? (
            <>
              {/* Product Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Pendapatan Produk"
                  value={formatCurrency(productReport.totalRevenue)}
                  icon={DollarSign}
                  color="green"
                />
                <StatCard
                  title="Total Qty Terjual"
                  value={productReport.totalQuantity.toLocaleString('id-ID')}
                  subtitle={`${productReport.totalProductsSold} jenis produk`}
                  icon={Package}
                  color="blue"
                />
                <StatCard
                  title="Rata-rata per Transaksi"
                  value={formatCurrency(productReport.totalProductsSold > 0 ? productReport.totalRevenue / productReport.totalProductsSold : 0)}
                  icon={FileText}
                  color="purple"
                />
              </div>

              {/* Top Products Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Produk Terlaris
                  </CardTitle>
                  <CardDescription>10 produk dengan pendapatan tertinggi</CardDescription>
                </CardHeader>
                <CardContent>
                  {productReport.topProducts.length === 0 ? (
                    <div className="flex justify-center items-center h-[200px]">
                      <p className="text-gray-500">Belum ada data penjualan produk</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]">#</TableHead>
                          <TableHead>Nama Produk</TableHead>
                          <TableHead className="text-right">Qty Terjual</TableHead>
                          <TableHead className="text-right">Pendapatan</TableHead>
                          <TableHead className="text-right">Harga Rata-rata</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productReport.topProducts.map((product, index) => (
                          <TableRow key={product.productId}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell className="text-right">{product.quantitySold.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-right font-medium text-green-600">{formatCurrency(product.revenue)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(product.avgPrice)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* Product Revenue Chart */}
              {productReport.topProducts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Distribusi Pendapatan per Produk</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={productReport.topProducts.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(1)}jt`} />
                          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value) => formatCurrency(typeof value === 'number' ? value : 0)} />
                          <Bar dataKey="revenue" name="Pendapatan" fill="#4F46E5" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex justify-center items-center h-[400px]">
              <p className="text-gray-500">Tidak ada data produk</p>
            </div>
          )}
        </TabsContent>

        {/* LAPORAN PELANGGAN */}
        <TabsContent value="customers" className="space-y-4">
          {isLoadingCustomers ? (
            <Skeleton className="h-[600px] w-full" />
          ) : customerReport ? (
            <>
              {/* Customer Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Total Pelanggan Aktif"
                  value={customerReport.totalCustomers.toString()}
                  icon={Users}
                  color="blue"
                />
                <StatCard
                  title="Total Piutang"
                  value={formatCurrency(customerReport.totalReceivables)}
                  subtitle="Belum dibayar pelanggan"
                  icon={CreditCard}
                  color="yellow"
                />
                <StatCard
                  title="Rata-rata Pembelian"
                  value={formatCurrency(customerReport.avgPurchasePerCustomer)}
                  subtitle="Per pelanggan"
                  icon={DollarSign}
                  color="green"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Customers */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-green-600" />
                      Pelanggan Terbaik
                    </CardTitle>
                    <CardDescription>Berdasarkan total pembelian</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {customerReport.topCustomers.length === 0 ? (
                      <div className="flex justify-center items-center h-[200px]">
                        <p className="text-gray-500">Belum ada data pelanggan</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead className="text-right">Invoice</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerReport.topCustomers.slice(0, 10).map((customer, index) => (
                            <TableRow key={customer.clientId}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">{customer.name}</TableCell>
                              <TableCell className="text-right">{customer.invoiceCount}</TableCell>
                              <TableCell className="text-right font-medium text-green-600">
                                {formatCurrency(customer.totalPurchase)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Highest Receivables */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-yellow-600" />
                      Piutang Tertinggi
                    </CardTitle>
                    <CardDescription>Pelanggan dengan hutang terbesar</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {customerReport.highestReceivables.length === 0 ? (
                      <div className="flex justify-center items-center h-[200px]">
                        <p className="text-gray-500">Tidak ada piutang yang belum dibayar</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Nama</TableHead>
                            <TableHead className="text-right">Piutang</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerReport.highestReceivables.map((customer, index) => (
                            <TableRow key={customer.clientId}>
                              <TableCell>{index + 1}</TableCell>
                              <TableCell className="font-medium">{customer.name}</TableCell>
                              <TableCell className="text-right font-medium text-yellow-600">
                                {formatCurrency(customer.outstanding)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Customer Purchase Chart */}
              {customerReport.topCustomers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Distribusi Pembelian per Pelanggan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={customerReport.topCustomers.slice(0, 8).map(c => ({ name: c.name, value: c.totalPurchase }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {customerReport.topCustomers.slice(0, 8).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(typeof value === 'number' ? value : 0)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex justify-center items-center h-[400px]">
              <p className="text-gray-500">Tidak ada data pelanggan</p>
            </div>
          )}
        </TabsContent>
        
        {/* RINCIAN INCOME & EXPENSES */}
        <TabsContent value="breakdown" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Rincian Pendapatan</CardTitle>
                <CardDescription>Breakdown pendapatan per kategori</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTransactions ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : incomeByCategory.length === 0 ? (
                  <div className="flex justify-center items-center h-[400px]">
                    <p className="text-gray-500">Tidak ada data pendapatan</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={incomeByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {incomeByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(typeof value === 'number' ? value : 0)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-2">
                      {incomeByCategory.map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-2" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <span className="text-sm font-medium">{category.name}</span>
                          </div>
                          <span className="text-sm font-semibold">{formatCurrency(category.value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t font-bold">
                        <span>Total Pendapatan:</span>
                        <span className="text-green-600">
                          {formatCurrency(incomeByCategory.reduce((sum, item) => sum + item.value, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rincian Beban</CardTitle>
                <CardDescription>Breakdown beban per kategori</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTransactions ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : expensesByCategory.length === 0 ? (
                  <div className="flex justify-center items-center h-[400px]">
                    <p className="text-gray-500">Tidak ada data beban</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={expensesByCategory}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {expensesByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(typeof value === 'number' ? value : 0)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    <div className="space-y-2">
                      {expensesByCategory.map((category, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-2" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <span className="text-sm font-medium">{category.name}</span>
                          </div>
                          <span className="text-sm font-semibold">{formatCurrency(category.value)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between pt-2 border-t font-bold">
                        <span>Total Beban:</span>
                        <span className="text-red-600">
                          {formatCurrency(expensesByCategory.reduce((sum, item) => sum + item.value, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
