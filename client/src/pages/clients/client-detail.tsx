import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, Phone, MapPin, FileText, Calendar, AlertCircle, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

type Client = {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
  clientNumber: string;
};

type ClientStats = {
  totalPurchases: number;
  unpaidInvoicesCount: number;
  lastPurchaseDate: string | null;
};

export default function ClientDetailPage() {
  const { id } = useParams();
  const clientId = parseInt(id!);

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<ClientStats>({
    queryKey: [`/api/clients/${clientId}/stats`],
  });

  if (clientLoading || statsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Client not found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">The client you're looking for doesn't exist.</p>
        <Link href="/clients">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="sm" data-testid="button-back-to-clients">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-client-name">
              {client.name}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Client #{client.clientNumber}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Purchases</h3>
              <ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-total-purchases">
              {stats?.totalPurchases || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Invoices created</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Unpaid Invoices</h3>
              <AlertCircle className={`h-5 w-5 ${stats?.unpaidInvoicesCount ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-unpaid-invoices">
              {stats?.unpaidInvoicesCount || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats?.unpaidInvoicesCount === 0 ? 'All paid' : 'Pending payment'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 dark:border-gray-700">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Purchase</h3>
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-last-purchase">
              {stats?.lastPurchaseDate ? format(new Date(stats.lastPurchaseDate), 'MMM d, yyyy') : 'Never'}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats?.lastPurchaseDate ? 'Date of last invoice' : 'No purchases yet'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Client Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  {client.email ? (
                    <a 
                      href={`mailto:${client.email}`} 
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline break-all"
                      data-testid="link-email"
                    >
                      {client.email}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400">Not provided</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                  {client.phone ? (
                    <a 
                      href={`tel:${client.phone}`} 
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      data-testid="link-phone"
                    >
                      {client.phone}
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                  {client.address ? (
                    <p className="text-sm font-medium text-gray-900 dark:text-white" data-testid="text-address">
                      {client.address}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Not provided</p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Tax Number</p>
                  {client.taxNumber ? (
                    <p className="text-sm font-medium text-gray-900 dark:text-white" data-testid="text-tax-number">
                      {client.taxNumber}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Not provided</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {stats?.lastPurchaseDate && (
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Marketing Follow-up
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Last purchase was on {format(new Date(stats.lastPurchaseDate), 'MMMM d, yyyy')}. 
                    {stats.unpaidInvoicesCount > 0 && ` This client has ${stats.unpaidInvoicesCount} unpaid invoice${stats.unpaidInvoicesCount > 1 ? 's' : ''}.`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
