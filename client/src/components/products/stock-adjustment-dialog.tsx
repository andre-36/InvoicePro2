import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Plus, Minus } from "lucide-react";

type Product = {
  id: number;
  name: string;
  sku: string;
  currentStock?: number;
  unit?: string;
};

type ProductBatch = {
  id: number;
  batchNumber: string;
  remainingQuantity: string;
  capitalCost: string;
  purchaseDate: string;
  supplierName?: string;
};

interface StockAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  storeId?: number;
}

const adjustmentSchema = z.object({
  type: z.enum(["increase", "decrease"]),
  quantity: z.string().min(1, "Quantity is required").refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
    "Quantity must be a positive number"
  ),
  reason: z.string().min(1, "Reason is required"),
  notes: z.string().optional(),
  batchId: z.string().optional(),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

export function StockAdjustmentDialog({
  open,
  onOpenChange,
  product,
  storeId = 1,
}: StockAdjustmentDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedBatch, setSelectedBatch] = useState<string>("");

  const form = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      type: "increase",
      quantity: "",
      reason: "",
      notes: "",
      batchId: "",
    },
  });

  const { data: batches = [], isLoading: batchesLoading } = useQuery<ProductBatch[]>({
    queryKey: ['/api/products', product?.id, 'batches', storeId],
    queryFn: async () => {
      if (!product?.id) return [];
      const response = await fetch(`/api/products/${product.id}/batches?storeId=${storeId}`, {
        credentials: 'include',
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: open && !!product?.id,
  });

  const adjustmentMutation = useMutation({
    mutationFn: async (data: AdjustmentFormData) => {
      const today = new Date().toISOString().split('T')[0];
      const response = await apiRequest('POST', '/api/stock-adjustments', {
        storeId,
        productId: product?.id,
        productBatchId: data.batchId ? parseInt(data.batchId) : null,
        type: data.type,
        quantity: parseFloat(data.quantity),
        reason: data.reason,
        date: today,
        notes: data.notes || null,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Stock adjusted",
        description: `Stock has been ${form.getValues('type') === 'increase' ? 'increased' : 'decreased'} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/stores/1/products/stock'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products', product?.id] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to adjust stock: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdjustmentFormData) => {
    adjustmentMutation.mutate(data);
  };

  const adjustmentType = form.watch("type");

  const predefinedReasons = {
    increase: [
      "Found during stock count",
      "Return from customer",
      "Transfer from other location",
      "Initial stock input",
      "Other",
    ],
    decrease: [
      "Damaged goods",
      "Lost/Missing",
      "Expired",
      "Stock count correction",
      "Sample/Display",
      "Other",
    ],
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Stock Adjustment</DialogTitle>
          <DialogDescription>
            Adjust stock for: <strong>{product?.name}</strong> ({product?.sku})
            <br />
            Current stock: <strong>{product?.currentStock ?? 0} {product?.unit || 'pcs'}</strong>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Adjustment Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="increase" id="increase" />
                        <Label htmlFor="increase" className="flex items-center gap-1 cursor-pointer">
                          <Plus className="h-4 w-4 text-green-600" />
                          Increase Stock
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="decrease" id="decrease" />
                        <Label htmlFor="decrease" className="flex items-center gap-1 cursor-pointer">
                          <Minus className="h-4 w-4 text-red-600" />
                          Decrease Stock
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {adjustmentType === "decrease" && batches.length > 0 && (
              <FormField
                control={form.control}
                name="batchId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Batch (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Auto (FIFO - oldest first)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Auto (FIFO - oldest first)</SelectItem>
                        {batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id.toString()}>
                            {batch.batchNumber} - {parseFloat(batch.remainingQuantity)} {product?.unit || 'pcs'} @ {formatCurrency(parseFloat(batch.capitalCost))}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="Enter quantity"
                        {...field}
                      />
                      <span className="text-muted-foreground">{product?.unit || 'pcs'}</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {predefinedReasons[adjustmentType].map((reason) => (
                        <SelectItem key={reason} value={reason}>
                          {reason}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional details..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={adjustmentMutation.isPending}
                className={adjustmentType === "increase" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              >
                {adjustmentMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {adjustmentType === "increase" ? "Add Stock" : "Remove Stock"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
