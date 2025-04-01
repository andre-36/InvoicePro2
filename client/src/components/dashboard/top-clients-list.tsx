import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface TopClient {
  id: number;
  name: string;
  email: string;
  totalValue: number;
  invoiceCount: number;
  initials: string;
}

export function TopClientsList() {
  const { data, isLoading, error } = useQuery<TopClient[]>({
    queryKey: ['/api/dashboard/top-clients'],
  });

  if (isLoading) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-6 w-20" />
          </div>
        </CardHeader>
        <CardContent className="p-1">
          <ul className="divide-y divide-gray-200">
            {Array(5).fill(0).map((_, i) => (
              <li key={i} className="px-4 py-3">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <Skeleton className="h-5 w-3/4 mb-1" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-5 w-16 mb-1" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="lg:col-span-2">
        <CardHeader className="px-5 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">Top Clients</CardTitle>
            <Link href="/clients">
              <a className="text-sm font-medium text-primary hover:text-primary/80">View All</a>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-64">
          <p className="text-gray-500">Failed to load client data</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-gray-900">Top Clients</CardTitle>
          <Link href="/clients">
            <a className="text-sm font-medium text-primary hover:text-primary/80">View All</a>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-1">
        <ul className="divide-y divide-gray-200">
          {data.map((client) => (
            <li key={client.id} className="px-4 py-3 hover:bg-gray-50 rounded-md">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-medium">
                  {client.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <Link href={`/clients/${client.id}`}>
                    <a className="text-sm font-medium text-gray-900 hover:underline truncate">
                      {client.name}
                    </a>
                  </Link>
                  <p className="text-xs text-gray-500 truncate">{client.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatCurrency(client.totalValue)}</p>
                  <p className="text-xs text-gray-500">{client.invoiceCount} invoice{client.invoiceCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
