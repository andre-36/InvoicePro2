import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { Truck, Package } from "lucide-react";
import { Link } from "wouter";

import { useStore } from "@/lib/store-context";

type Invoice = {
  id: number;
  invoiceNumber: string;
  clientId: number;
  clientName?: string;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: string;
  amountPaid: string;
  status: string;
  deliveryStatus: string;
  issueDate?: string;
};

type Client = {
  id: number;
  name: string;
};

export function DeliveredUnpaidInvoices() {
  const { currentStoreId } = useStore();
  const { data: invoices, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: [`/api/stores/${currentStoreId}/invoices`],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: [`/api/stores/${currentStoreId}/clients`],
  });

  if (invoicesLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-500" />
            Delivered but Unpaid
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const clientMap = new Map((clients || []).map(c => [c.id, c.name]));

  const deliveredUnpaid = (invoices || [])
    .filter((inv) => {
      const isPaid = inv.status === 'paid' || inv.status === 'cancelled' || inv.status === 'void';
      const hasDelivery = inv.deliveryStatus === 'partial_delivered' || inv.deliveryStatus === 'delivered';
      return !isPaid && hasDelivery;
    })
    .sort((a, b) => {
      const remainingA = parseFloat(a.totalAmount) - parseFloat(a.amountPaid || '0');
      const remainingB = parseFloat(b.totalAmount) - parseFloat(b.amountPaid || '0');
      return remainingB - remainingA;
    })
    .slice(0, 10);

  const totalUnpaid = deliveredUnpaid.reduce((sum, inv) => {
    return sum + (parseFloat(inv.totalAmount) - parseFloat(inv.amountPaid || '0'));
  }, 0);

  const getDeliveryBadge = (status: string) => {
    if (status === 'delivered') {
      return { text: 'Delivered', bgColor: 'bg-green-100', textColor: 'text-green-700' };
    }
    return { text: 'Partial', bgColor: 'bg-amber-100', textColor: 'text-amber-700' };
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Truck className="h-4 w-4 text-blue-500" />
            Delivered but Unpaid
          </CardTitle>
          <div className="text-right">
            <span className="text-xs text-gray-500">Total: </span>
            <span className="text-sm font-bold text-blue-600">{formatCurrency(totalUnpaid)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {deliveredUnpaid.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No delivered unpaid invoices</p>
          </div>
        ) : (
          <div className="space-y-2">
            {deliveredUnpaid.map((invoice) => {
              const remaining = parseFloat(invoice.totalAmount) - parseFloat(invoice.amountPaid || '0');
              const badge = getDeliveryBadge(invoice.deliveryStatus);
              const clientName = invoice.clientName || clientMap.get(invoice.clientId) || 'Unknown Client';
              
              return (
                <Link
                  key={invoice.id}
                  href={`/invoices/${invoice.id}`}
                  className="block p-3 rounded-lg border border-blue-200 bg-blue-50 transition-colors hover:bg-blue-100"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{invoice.invoiceNumber}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${badge.bgColor} ${badge.textColor}`}>
                          {badge.text}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 truncate">{clientName}</p>
                      <p className="text-xs text-gray-400">
                        {invoice.issueDate && format(parseISO(invoice.issueDate), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-semibold text-blue-600">{formatCurrency(remaining)}</p>
                      <p className="text-xs text-gray-500">unpaid</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <Link href="/invoices" className="block mt-4 text-center text-sm text-primary hover:underline">
          View all invoices →
        </Link>
      </CardContent>
    </Card>
  );
}
