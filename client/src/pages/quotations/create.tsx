import { QuotationForm } from "@/components/quotations/quotation-form";
import { useLocation } from "wouter";

export default function CreateQuotationPage() {
  const [, navigate] = useLocation();
  
  const handleSuccess = () => {
    navigate("/quotations");
  };
  
  return (
    <QuotationForm onSuccess={handleSuccess} />
  );
}