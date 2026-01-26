import { ReturnForm } from "@/components/returns/return-form";
import { useLocation } from "wouter";

export default function CreateReturnPage() {
  const [, navigate] = useLocation();
  
  const handleSuccess = (returnId: number) => {
    navigate(`/returns/${returnId}`);
  };
  
  return (
    <ReturnForm onSuccess={handleSuccess} />
  );
}
