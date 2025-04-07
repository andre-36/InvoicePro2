import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Invoice {
  id: number;
  invoiceNumber: string;
  clientName: string;
  issueDate: string;
  total: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
}

export function RecentInvoicesTable() {
  const { data, isLoading, error } = useQuery<Invoice[]>({
    queryKey: ['/api/dashboard/recent-invoices'],
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Paid</Badge>;
      case 'sent':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200">Overdue</Badge>;
      case 'draft':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Draft</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card className="lg:col-span-3">
        <CardHeader className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-6 w-20" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full divide-y divide-gray-200">
              <div className="bg-gray-50 px-5 py-3">
                <div className="grid grid-cols-5 gap-4">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-4 w-full" />
                  ))}
                </div>
              </div>
              <div>
                {Array(5).fill(0).map((_, i) => (
                  <div key={i} className="px-5 py-4">
                    <div className="grid grid-cols-5 gap-4">
                      {Array(5).fill(0).map((_, j) => (
                        <Skeleton key={j} className="h-5 w-full" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="lg:col-span-3">
        <CardHeader className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Recent Invoices</CardTitle>
            <Link href="/invoices">
              <a className="text-sm font-medium text-primary hover:text-primary/80">View All</a>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <p className="text-gray-500">Failed to load invoice data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-3">
      <CardHeader className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Invoices</CardTitle>
          <Link 
            href="/invoices" 
            className="text-sm font-medium text-primary hover:text-primary/80"
          >
            View All
          </Link>
        </div>
      </CardHeader>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
              <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th scope="col" className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-primary">
                  <Link 
                    href={`/invoices/${invoice.id}`}
                    className="hover:underline"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-800">{invoice.clientName}</td>
                <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.issueDate)}</td>
                <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(invoice.total)}</td>
                <td className="px-5 py-4 whitespace-nowrap">{getStatusBadge(invoice.status)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
