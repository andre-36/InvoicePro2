import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form";
import { useLocation } from "wouter";

export default function CreatePurchaseOrderPage() {
  const [, navigate] = useLocation();
  
  const handleSuccess = () => {
    navigate("/purchase-orders");
  };
  
  return (
    <PurchaseOrderForm onSuccess={handleSuccess} />
  );
}