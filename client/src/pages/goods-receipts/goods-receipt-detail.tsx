import { useRoute } from "wouter";
import GoodsReceiptForm from "@/components/goods-receipts/goods-receipt-form";

export default function GoodsReceiptDetailPage() {
  const [, params] = useRoute("/goods-receipts/:id");
  const goodsReceiptId = params?.id ? parseInt(params.id) : undefined;
  
  return <GoodsReceiptForm goodsReceiptId={goodsReceiptId} />;
}
