import { InvoiceForm } from "@/components/invoices/invoice-form";
import { useLocation } from "wouter";

export default function CreateInvoicePage() {
  const [, navigate] = useLocation();
  
  const handleSuccess = () => {
    navigate("/invoices");
  };
  
  return (
    <InvoiceForm onSuccess={handleSuccess} />
  );
}
