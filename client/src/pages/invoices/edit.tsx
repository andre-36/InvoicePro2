import { InvoiceForm } from "@/components/invoices/invoice-form";
import { useLocation } from "wouter";

interface EditInvoicePageProps {
  id: number;
}

export default function EditInvoicePage({ id }: EditInvoicePageProps) {
  const [, navigate] = useLocation();
  
  const handleSuccess = () => {
    navigate(`/invoices/${id}`);
  };
  
  return (
    <InvoiceForm invoiceId={id} onSuccess={handleSuccess} />
  );
}
