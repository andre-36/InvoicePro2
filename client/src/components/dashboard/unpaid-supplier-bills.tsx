import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { format, differenceInDays, parseISO } from "date-fns";
import { FileText, AlertCircle } from "lucide-react";
import { Link } from "wouter";

type GoodsReceipt = {
  id: number;
  receiptNumber: string;
  supplierName: string;
  receiptDate: string;
  dueDate: string | null;
  totalAmount: string;
  amountPaid: string;
  status: string;
};

export function UnpaidSupplierBills() {
  const { data: receipts, isLoading } = useQuery<GoodsReceipt[]>({
    queryKey: ['/api/stores/1/goods-receipts'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-500" />
            Unpaid Supplier Bills
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

  const unpaidReceipts = (receipts || [])
    .filter((r) => r.status !== 'paid' && r.status !== 'cancelled')
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 10);

  const getDaysLabel = (dueDate: string | null) => {
    if (!dueDate) return { text: 'No due date', color: 'text-gray-500' };
    const days = differenceInDays(parseISO(dueDate), new Date());
    if (days < 0) return { text: `${Math.abs(days)} days overdue`, color: 'text-red-600' };
    if (days === 0) return { text: 'Due today', color: 'text-amber-600' };
    if (days <= 7) return { text: `Due in ${days} days`, color: 'text-amber-500' };
    return { text: `Due in ${days} days`, color: 'text-gray-500' };
  };

  const totalUnpaid = unpaidReceipts.reduce((sum, r) => {
    return sum + (parseFloat(r.totalAmount) - parseFloat(r.amountPaid || '0'));
  }, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-500" />
            Unpaid Supplier Bills
          </CardTitle>
          <div className="text-right">
            <span className="text-xs text-gray-500">Total: </span>
            <span className="text-sm font-bold text-red-600">{formatCurrency(totalUnpaid)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {unpaidReceipts.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No unpaid supplier bills</p>
          </div>
        ) : (
          <div className="space-y-2">
            {unpaidReceipts.map((receipt) => {
              const remaining = parseFloat(receipt.totalAmount) - parseFloat(receipt.amountPaid || '0');
              const daysInfo = getDaysLabel(receipt.dueDate);
              const isOverdue = receipt.dueDate && differenceInDays(parseISO(receipt.dueDate), new Date()) < 0;
              
              return (
                <Link
                  key={receipt.id}
                  href={`/goods-receipts/${receipt.id}`}
                  className={`block p-3 rounded-lg border transition-colors hover:bg-gray-50 ${
                    isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{receipt.receiptNumber}</p>
                        {isOverdue && <AlertCircle className="h-4 w-4 text-red-500" />}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{receipt.supplierName}</p>
                      <p className={`text-xs ${daysInfo.color}`}>{daysInfo.text}</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-sm font-semibold text-red-600">{formatCurrency(remaining)}</p>
                      {receipt.dueDate && (
                        <p className="text-xs text-gray-400">
                          {format(parseISO(receipt.dueDate), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        <Link href="/goods-receipts" className="block mt-4 text-center text-sm text-primary hover:underline">
          View all goods receipts →
        </Link>
      </CardContent>
    </Card>
  );
}
