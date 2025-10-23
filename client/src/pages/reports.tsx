import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

type DateRange = "this_month" | "last_month" | "this_quarter" | "this_year" | "custom";

type RevenueData = {
  dates: string[];
  income: number[];
  expenses: number[];
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
  const [activeTab, setActiveTab] = useState("revenue");
  const [dateRange, setDateRange] = useState<DateRange>("this_month");
  
  // Revenue chart data
  const { data: revenueData, isLoading: isLoadingRevenue } = useQuery<RevenueData>({
    queryKey: ['/api/stores/1/dashboard/revenue'],
  });
  
  // Transactions for expense/income breakdown
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/stores/1/transactions'],
  });
  
  // Process transaction data for charts
  const processTransactionsByCategory = (type: 'income' | 'expense') => {
    if (!transactions) return [];
    
    // Get transactions of specified type
    const filteredTransactions = transactions.filter(t => t.type === type);
    
    // Group by category and sum amounts
    const categories = filteredTransactions.reduce((acc, transaction) => {
      const category = transaction.category || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += parseFloat(transaction.amount);
      return acc;
    }, {} as Record<string, number>);
    
    // Convert to chart data format
    return Object.entries(categories).map(([name, value]) => ({
      name,
      value: parseFloat(value.toFixed(2))
    }));
  };
  
  // Prepare revenue chart data
  const prepareRevenueChartData = () => {
    if (!revenueData) return [];
    
    return revenueData.dates.map((date, index) => ({
      name: date,
      income: revenueData.income[index],
      expenses: revenueData.expenses[index],
      profit: revenueData.income[index] - revenueData.expenses[index]
    }));
  };
  
  const incomeByCategory = processTransactionsByCategory('income');
  const expensesByCategory = processTransactionsByCategory('expense');
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Analyze your business performance</p>
        </div>
        
        <Select
          value={dateRange}
          onValueChange={(value) => setDateRange(value as DateRange)}
        >
          <SelectTrigger className="w-[180px]">
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
      
      <Tabs
        defaultValue="revenue"
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="revenue">Revenue & Expenses</TabsTrigger>
          <TabsTrigger value="income">Income Breakdown</TabsTrigger>
          <TabsTrigger value="expenses">Expense Breakdown</TabsTrigger>
        </TabsList>
        
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue vs Expenses</CardTitle>
              <CardDescription>Compare your revenue and expenses over time</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingRevenue ? (
                <Skeleton className="h-[400px] w-full" />
              ) : !revenueData ? (
                <div className="flex justify-center items-center h-[400px]">
                  <p className="text-gray-500">Failed to load revenue data</p>
                </div>
              ) : (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={prepareRevenueChartData()}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis 
                        tickFormatter={(value) => formatCurrency(value)}
                        width={100}
                      />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(typeof value === 'number' ? value : 0), '']}
                        contentStyle={{ 
                          backgroundColor: 'white',
                          borderColor: '#e2e8f0',
                          borderRadius: '0.375rem'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="income" name="Income" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expenses" name="Expenses" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="profit" name="Profit" fill="#10B981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="income" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Income by Category</CardTitle>
              <CardDescription>Breakdown of your income sources</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <Skeleton className="h-[400px] w-full" />
              ) : !transactions ? (
                <div className="flex justify-center items-center h-[400px]">
                  <p className="text-gray-500">Failed to load transaction data</p>
                </div>
              ) : incomeByCategory.length === 0 ? (
                <div className="flex justify-center items-center h-[400px]">
                  <p className="text-gray-500">No income data available for the selected period</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="h-[400px] flex justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={incomeByCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={150}
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
                  
                  <div className="flex flex-col justify-center">
                    <h3 className="text-lg font-medium mb-4">Income Categories</h3>
                    <div className="space-y-3">
                      {incomeByCategory.map((category, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-2" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <span className="text-sm font-medium">{category.name}</span>
                          </div>
                          <span className="text-sm">{formatCurrency(category.value)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex justify-between">
                        <span className="font-semibold">Total Income:</span>
                        <span className="font-semibold">
                          {formatCurrency(incomeByCategory.reduce((sum, item) => sum + item.value, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expenses by Category</CardTitle>
              <CardDescription>Breakdown of your expense categories</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingTransactions ? (
                <Skeleton className="h-[400px] w-full" />
              ) : !transactions ? (
                <div className="flex justify-center items-center h-[400px]">
                  <p className="text-gray-500">Failed to load transaction data</p>
                </div>
              ) : expensesByCategory.length === 0 ? (
                <div className="flex justify-center items-center h-[400px]">
                  <p className="text-gray-500">No expense data available for the selected period</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="h-[400px] flex justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensesByCategory}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={150}
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
                  
                  <div className="flex flex-col justify-center">
                    <h3 className="text-lg font-medium mb-4">Expense Categories</h3>
                    <div className="space-y-3">
                      {expensesByCategory.map((category, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div 
                              className="w-4 h-4 rounded-full mr-2" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            ></div>
                            <span className="text-sm font-medium">{category.name}</span>
                          </div>
                          <span className="text-sm">{formatCurrency(category.value)}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex justify-between">
                        <span className="font-semibold">Total Expenses:</span>
                        <span className="font-semibold">
                          {formatCurrency(expensesByCategory.reduce((sum, item) => sum + item.value, 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
