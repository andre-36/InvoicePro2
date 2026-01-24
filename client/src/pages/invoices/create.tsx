import { InvoiceForm } from "@/components/invoices/invoice-form";
import { useLocation } from "wouter";

export default function CreateInvoicePage() {
  const [, navigate] = useLocation();
  
  const handleSuccess = (invoiceId: number) => {
    navigate(`/invoices/${invoiceId}`);
  };
  
  return (
    <InvoiceForm onSuccess={handleSuccess} />
  );
}
