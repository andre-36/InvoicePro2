import { QuotationForm } from "@/components/quotations/quotation-form";
import { useLocation } from "wouter";

interface EditQuotationPageProps {
  id: number;
}

export default function EditQuotationPage({ id }: EditQuotationPageProps) {
  const [, navigate] = useLocation();
  
  const handleSuccess = () => {
    navigate(`/quotations/${id}`);
  };
  
  return (
    <QuotationForm quotationId={id} onSuccess={handleSuccess} />
  );
}
