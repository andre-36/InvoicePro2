import { useRoute } from "wouter";
import GoodsReceiptForm from "@/components/goods-receipts/goods-receipt-form";

export default function GoodsReceiptDetailPage() {
  const [matchEdit, editParams] = useRoute("/goods-receipts/:id/edit");
  const [matchView, viewParams] = useRoute("/goods-receipts/:id");
  
  const params = matchEdit ? editParams : viewParams;
  const goodsReceiptId = params?.id ? parseInt(params.id) : undefined;
  const mode = matchEdit ? 'edit' : 'view';
  
  return <GoodsReceiptForm goodsReceiptId={goodsReceiptId} mode={mode as any} />;
}
