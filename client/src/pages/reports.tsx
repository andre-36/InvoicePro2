
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Download, FileDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

type DateRange = "this_month" | "last_month" | "this_quarter" | "this_year" | "custom";

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

type Transaction = {
  id: number;
  description: string;
  amount: string;
  date: string;
  type: 'income' | 'expense';
  category: string | null;
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState("profit-loss");
  const [dateRange, setDateRange] = useState<DateRange>("this_month");
  
  // Financial Report data
  const { data: financialReport, isLoading: isLoadingFinancial } = useQuery<FinancialReport>({
    queryKey: ['/api/stores/1/reports/financial', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/stores/1/reports/financial?dateRange=${dateRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch financial report');
      return response.json();
    },
  });
  
  // Cash Flow Report data
  const { data: cashFlowReport, isLoading: isLoadingCashFlow } = useQuery<CashFlowReport>({
    queryKey: ['/api/stores/1/reports/cashflow', dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/stores/1/reports/cashflow?dateRange=${dateRange}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch cashflow report');
      return response.json();
    },
  });
  
  // Transactions for detailed breakdown
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/stores/1/transactions'],
  });
  
  // Process transaction data for charts
  const processTransactionsByCategory = (type: 'income' | 'expense') => {
    if (!transactions) return [];
    
    const filteredTransactions = transactions.filter(t => t.type === type);
    
    const categories = filteredTransactions.reduce((acc, transaction) => {
      const category = transaction.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += parseFloat(transaction.amount);
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }));
  };
  
  const incomeByCategory = processTransactionsByCategory('income');
  const expensesByCategory = processTransactionsByCategory('expense');

  const downloadReport = (reportType: string) => {
    // Implementation for downloading reports as PDF/Excel
    console.log(`Downloading ${reportType} report`);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Keuangan</h1>
          <p className="text-sm text-gray-500 mt-1">Laporan keuangan lengkap sesuai standar akuntansi</p>
        </div>
        
        <div className="flex gap-2">
          <Select
            value={dateRange}
            onValueChange={(value) => setDateRange(value as DateRange)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="This Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">Bulan Ini</SelectItem>
              <SelectItem value="last_month">Bulan Lalu</SelectItem>
              <SelectItem value="this_quarter">Kuartal Ini</SelectItem>
              <SelectItem value="this_year">Tahun Ini</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => downloadReport(activeTab)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <Tabs
        defaultValue="profit-loss"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="profit-loss">Laba Rugi</TabsTrigger>
          <TabsTrigger value="cash-flow">Arus Kas</TabsTrigger>
          <TabsTrigger value="inventory">Persediaan & HPP</TabsTrigger>
          <TabsTrigger value="breakdown">Rincian</TabsTrigger>
        </TabsList>
        
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LAPORAN PERSEDIAAN & HPP */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Laporan Persediaan & HPP</CardTitle>
              <CardDescription>Detail persediaan barang dan harga pokok penjualan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Sistem Batch Tracking</h3>
                  <p className="text-sm text-blue-800">
                    Sistem ini menggunakan metode FIFO (First In, First Out) untuk menghitung HPP secara otomatis.
                    Setiap penjualan akan mengambil dari batch tertua terlebih dahulu.
                  </p>
                </div>

                <div className="text-sm text-gray-600">
                  <p>Untuk melihat detail persediaan dan profitabilitas per batch, silakan kunjungi:</p>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li><a href="/products" className="text-blue-600 hover:underline">Halaman Products</a> - untuk melihat stok per produk</li>
                    <li><a href="/dashboard" className="text-blue-600 hover:underline">Dashboard</a> - untuk melihat nilai total persediaan</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
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
