import { PurchaseOrderForm } from "@/components/purchase-orders/purchase-order-form";
import { useLocation } from "wouter";

interface EditPurchaseOrderPageProps {
  id: number;
}

export default function EditPurchaseOrderPage({ id }: EditPurchaseOrderPageProps) {
  const [, navigate] = useLocation();
  
  const handleSuccess = () => {
    navigate(`/purchase-orders/${id}`);
  };
  
  return (
    <PurchaseOrderForm purchaseOrderId={id} onSuccess={handleSuccess} />
  );
}
