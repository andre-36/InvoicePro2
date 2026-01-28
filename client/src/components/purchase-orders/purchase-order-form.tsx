import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { X, Save, Plus, Trash2, ArrowLeft, Package, ChevronsUpDown, Check, ChevronUp, ChevronDown, Edit, DollarSign, CheckCircle, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertPurchaseOrderSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

// Extended schema for the form
const extendedPurchaseOrderSchema = insertPurchaseOrderSchema.extend({
  orderDate: z.coerce.date(),
  expectedDeliveryDate: z.coerce.date().optional(),
});

// Schema for purchase order items
const purchaseOrderItemSchema = z.object({
  id: z.number().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.string().min(1, "Quantity is required"),
  unitCost: z.string().min(1, "Unit cost is required"),
  taxRate: z.string().optional(),
  subtotal: z.string().optional(),
  taxAmount: z.string().optional(),
  totalAmount: z.string().optional(),
  productId: z.number().nullable().optional(),
});

const purchaseOrderFormSchema = z.object({
  purchaseOrder: extendedPurchaseOrderSchema,
  items: z.array(purchaseOrderItemSchema).min(1, "At least one item is required"),
});

type PurchaseOrderFormValues = z.infer<typeof purchaseOrderFormSchema>;
type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>;

interface PurchaseOrderFormProps {
  purchaseOrderId?: number;
  onSuccess?: () => void;
}

// Purchase Order Item Row Component
interface PurchaseOrderItemRowProps {
  index: number;
  item: PurchaseOrderItem;
  products: any[];
  updateItem: (index: number, field: string, value: string) => void;
  removeItem: (index: number) => void;
  selectProduct: (index: number, productId: number) => void;
  canRemove: boolean;
}

function PurchaseOrderItemRow({
  index,
  item,
  products,
  updateItem,
  removeItem,
  selectProduct,
  canRemove
}: PurchaseOrderItemRowProps) {
  const [productOpen, setProductOpen] = useState(false);

  const handleProductSelect = (productId: number) => {
    selectProduct(index, productId);
    setProductOpen(false);
  };

  const selectedProduct = item.productId ? products.find(p => p.id === item.productId) : null;

  return (
    <tr className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
      <td className="px-3 py-2 text-sm text-gray-500">{index + 1}</td>
      <td className="px-3 py-2">
        <Popover open={productOpen} onOpenChange={setProductOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={productOpen}
              className="w-full justify-between text-sm h-9 px-2 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
            >
              <span className="truncate text-left">
                {selectedProduct ? selectedProduct.name : (item.description || "Select product...")}
              </span>
              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search products..." />
              <CommandList>
                <CommandEmpty>No product found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="manual"
                    onSelect={() => {
                      selectProduct(index, 0);
                      setProductOpen(false);
                    }}
                  >
                    <Check className={`mr-2 h-4 w-4 ${!item.productId ? "opacity-100" : "opacity-0"}`} />
                    Enter manually
                  </CommandItem>
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={() => handleProductSelect(product.id)}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${item.productId === product.id ? "opacity-100" : "opacity-0"}`}
                      />
                      <div className="flex flex-col">
                        <span>{product.name}</span>
                        <span className="text-xs text-gray-500">Cost: {formatCurrency(product.costPrice || '0')}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {!selectedProduct && (
          <Input
            value={item.description}
            onChange={(e) => updateItem(index, 'description', e.target.value)}
            placeholder="Item description"
            className="mt-1 h-8 text-sm"
          />
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={item.quantity}
            onChange={(e) => updateItem(index, 'quantity', e.target.value)}
            placeholder="1"
            min="0"
            step="any"
            className="h-8 text-sm text-right flex-1"
          />
          <div className="flex flex-col">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 w-6 p-0 hover:bg-gray-100"
              onClick={() => {
                const currentQty = parseFloat(item.quantity) || 0;
                updateItem(index, 'quantity', String(currentQty + 1));
              }}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 w-6 p-0 hover:bg-gray-100"
              onClick={() => {
                const currentQty = parseFloat(item.quantity) || 0;
                if (currentQty > 0) {
                  updateItem(index, 'quantity', String(Math.max(0, currentQty - 1)));
                }
              }}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          value={item.unitCost}
          onChange={(e) => updateItem(index, 'unitCost', e.target.value)}
          placeholder="0.00"
          min="0"
          step="0.01"
          className="h-8 text-sm text-right"
        />
      </td>
      <td className="px-3 py-2">
        <Select value={item.taxRate || "10"} onValueChange={(value) => updateItem(index, 'taxRate', value)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="10%" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">0%</SelectItem>
            <SelectItem value="5">5%</SelectItem>
            <SelectItem value="10">10%</SelectItem>
            <SelectItem value="15">15%</SelectItem>
            <SelectItem value="20">20%</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-3 py-2 text-right text-sm font-medium">
        {formatCurrency(item.totalAmount || "0")}
      </td>
      <td className="px-3 py-2 text-center">
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeItem(index)}
            className="text-gray-400 hover:text-red-600 p-1 h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </td>
    </tr>
  );
}

export function PurchaseOrderForm({ purchaseOrderId, onSuccess }: PurchaseOrderFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [items, setItems] = useState<PurchaseOrderItem[]>([
    {
      id: undefined,
      description: "",
      quantity: "1",
      unitCost: "0",
      taxRate: "10",
      subtotal: "0",
      taxAmount: "0",
      totalAmount: "0",
      productId: null
    }
  ]);
  
  // Supplier combobox state
  const [supplierComboboxOpen, setSupplierComboboxOpen] = useState(false);
  
  // Back confirmation dialog state
  const [showBackConfirmDialog, setShowBackConfirmDialog] = useState(false);
  
  // PO Payment state (for prepaid POs)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentType: 'Bank Transfer',
    amount: '',
    notes: ''
  });
  
  // Store original loaded data for comparison-based change detection
  const originalDataRef = useRef<string | null>(null);
  
  // Helper function to create a comparable snapshot of form data
  const createFormSnapshot = (poValues: any, itemsArray: PurchaseOrderItem[]): string => {
    const snapshot = {
      supplierName: poValues?.supplierName,
      orderDate: poValues?.orderDate?.toISOString?.() || poValues?.orderDate,
      expectedDeliveryDate: poValues?.expectedDeliveryDate?.toISOString?.() || poValues?.expectedDeliveryDate,
      notes: poValues?.notes || '',
      useFakturPajak: poValues?.useFakturPajak || false,
      isPrepaid: poValues?.isPrepaid || false,
      items: itemsArray.map(item => ({
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        unitCost: item.unitCost,
      }))
    };
    return JSON.stringify(snapshot);
  };
  
  // Function to check if there are unsaved changes by comparing with original
  const hasUnsavedChanges = (): boolean => {
    if (!originalDataRef.current) {
      // For new POs, check if any meaningful data has been entered
      if (!purchaseOrderId) {
        const hasItems = items.some(item => 
          item.productId || (item.description && item.description.trim() !== '')
        );
        const poValues = form.getValues('purchaseOrder');
        const hasSupplier = !!poValues?.supplierName;
        const hasNotes = !!(poValues?.notes && poValues.notes.trim() !== '');
        return hasItems || hasSupplier || hasNotes;
      }
      return false;
    }
    
    const currentSnapshot = createFormSnapshot(form.getValues('purchaseOrder'), items);
    return currentSnapshot !== originalDataRef.current;
  };
  
  // Handle back button with confirmation
  const handleBack = () => {
    const poValues = form.getValues('purchaseOrder');
    const hasSupplier = poValues.supplierName && poValues.supplierName.trim() !== '';
    const hasNonEmptyItems = items.some(item => item.description && item.description.trim() !== '');
    const hasMeaningfulData = hasSupplier || hasNonEmptyItems;
    
    if (hasUnsavedChanges() && hasMeaningfulData) {
      setShowBackConfirmDialog(true);
    } else {
      navigate(purchaseOrderId ? `/purchase-orders/${purchaseOrderId}` : '/purchase-orders');
    }
  };
  
  // Discard changes and go back
  const discardAndGoBack = () => {
    setShowBackConfirmDialog(false);
    navigate(purchaseOrderId ? `/purchase-orders/${purchaseOrderId}` : '/purchase-orders');
  };

  // Fetch suppliers for the dropdown
  const { data: suppliers } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
  });

  // Fetch products for product selection
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/products'],
  });

  // Fetch current user for default notes and tax rate
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/user'],
  });

  // Fetch existing purchase order for edit mode
  const { data: existingPO, isLoading: isLoadingPO } = useQuery<any>({
    queryKey: ['/api/purchase-orders', purchaseOrderId],
    enabled: !!purchaseOrderId,
  });

  // For new purchase orders, fetch the next PO number preview with fallback
  const { data: nextPONumberData, isError: isNumberError } = useQuery<{ purchaseOrderNumber: string }>({
    queryKey: ['/api/purchase-orders/next-number'],
    enabled: !purchaseOrderId, // Only for new purchase orders
  });
  
  const generateFallbackPONumber = () => {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    return `PO-${year}${month}-0001`;
  };
  
  const nextPONumber = nextPONumberData?.purchaseOrderNumber || 
    (isNumberError ? generateFallbackPONumber() : null);

  // Fetch PO payments for prepaid POs
  const { data: poPayments = [] } = useQuery<any[]>({
    queryKey: ['/api/purchase-orders', purchaseOrderId, 'payments'],
    enabled: !!purchaseOrderId,
  });

  // Form setup
  const form = useForm<PurchaseOrderFormValues>({
    resolver: zodResolver(purchaseOrderFormSchema),
    defaultValues: {
      purchaseOrder: {
        storeId: 1,
        supplierId: null,
        supplierName: "",
        supplierEmail: "",
        supplierPhone: "",
        supplierAddress: "",
        orderDate: new Date(),
        expectedDeliveryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        status: "pending",
        useFakturPajak: false,
        isPrepaid: false,
        subtotal: "0",
        taxRate: "10",
        taxAmount: "0",
        discount: "0",
        shipping: "0",
        totalAmount: "0",
        notes: ""
      },
      items: items
    }
  });

  // Watch the useFakturPajak toggle
  const useFakturPajak = form.watch('purchaseOrder.useFakturPajak');
  
  // Watch the isPrepaid toggle
  const isPrepaid = form.watch('purchaseOrder.isPrepaid');
  
  // Get the global tax rate from user settings
  const globalTaxRate = currentUser?.defaultTaxRate || 11;

  // Track if we've already loaded items for this PO
  const [itemsLoaded, setItemsLoaded] = useState(false);

  // Populate form with existing purchase order data when editing
  useEffect(() => {
    if (existingPO && purchaseOrderId && !itemsLoaded) {
      // Set form values from existing PO
      form.reset({
        purchaseOrder: {
          storeId: existingPO.storeId || 1,
          supplierId: existingPO.supplierId,
          supplierName: existingPO.supplierName || '',
          supplierEmail: existingPO.supplierEmail || '',
          supplierPhone: existingPO.supplierPhone || '',
          supplierAddress: existingPO.supplierAddress || '',
          orderDate: existingPO.orderDate ? new Date(existingPO.orderDate) : new Date(),
          expectedDeliveryDate: existingPO.expectedDeliveryDate ? new Date(existingPO.expectedDeliveryDate) : new Date(),
          status: existingPO.status || 'pending',
          useFakturPajak: existingPO.useFakturPajak || false,
          isPrepaid: existingPO.isPrepaid || false,
          subtotal: existingPO.subtotal?.toString() || '0',
          taxRate: existingPO.taxRate?.toString() || '10',
          taxAmount: existingPO.taxAmount?.toString() || '0',
          discount: existingPO.discount?.toString() || '0',
          shipping: existingPO.shipping?.toString() || '0',
          totalAmount: existingPO.totalAmount?.toString() || '0',
          notes: existingPO.notes || ''
        },
        items: []
      });
      
      // Set items from existing PO
      if (existingPO.items && Array.isArray(existingPO.items) && existingPO.items.length > 0) {
        const loadedItems = existingPO.items.map((item: any) => ({
          id: item.id,
          description: item.description || '',
          quantity: item.quantity?.toString() || '1',
          unitCost: item.unitCost?.toString() || '0',
          taxRate: item.taxRate?.toString() || '10',
          subtotal: item.subtotal?.toString() || '0',
          taxAmount: item.taxAmount?.toString() || '0',
          totalAmount: item.totalAmount?.toString() || '0',
          productId: item.productId || null
        }));
        setItems(loadedItems);
        setItemsLoaded(true);
        
        // Store original data snapshot for comparison-based change detection
        // Create snapshot immediately from the API data (not from state)
        const snapshotItems = loadedItems.map((item: any) => ({
          productId: item.productId || null,
          description: item.description || "",
          quantity: item.quantity || "1",
          unitCost: item.unitCost || "0",
        }));
        
        originalDataRef.current = createFormSnapshot({
          supplierName: existingPO.supplierName || '',
          orderDate: existingPO.orderDate ? new Date(existingPO.orderDate) : new Date(),
          expectedDeliveryDate: existingPO.expectedDeliveryDate ? new Date(existingPO.expectedDeliveryDate) : null,
          notes: existingPO.notes || '',
          useFakturPajak: existingPO.useFakturPajak || false,
          isPrepaid: existingPO.isPrepaid || false,
        }, snapshotItems as any);
      } else {
        // Keep the default empty item
        setItemsLoaded(true);
      }
    }
  }, [existingPO, purchaseOrderId, itemsLoaded]);

  // Handle supplier selection and auto-fill fields
  const handleSupplierSelect = (supplierId: number) => {
    const supplier = suppliers?.find(s => s.id === supplierId);
    if (supplier) {
      form.setValue('purchaseOrder.supplierId', supplierId);
      form.setValue('purchaseOrder.supplierName', supplier.name || '');
      form.setValue('purchaseOrder.supplierEmail', supplier.email || '');
      form.setValue('purchaseOrder.supplierPhone', supplier.phone || '');
      form.setValue('purchaseOrder.supplierAddress', supplier.address || '');
    }
    setSupplierComboboxOpen(false);
  };

  // Create/update purchase order mutation
  const mutation = useMutation({
    mutationFn: async (values: PurchaseOrderFormValues) => {
      const purchaseOrderData = {
        ...values.purchaseOrder,
        orderDate: values.purchaseOrder.orderDate.toISOString(),
        expectedDeliveryDate: values.purchaseOrder.expectedDeliveryDate?.toISOString(),
      };

      const formattedValues = {
        ...values,
        purchaseOrder: purchaseOrderData
      };

      if (purchaseOrderId) {
        return apiRequest('PUT', `/api/purchase-orders/${purchaseOrderId}`, formattedValues);
      } else {
        return apiRequest('POST', '/api/purchase-orders', formattedValues);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders'] });
      toast({
        title: purchaseOrderId ? "Purchase order updated" : "Purchase order created",
        description: purchaseOrderId ? "Purchase order has been updated successfully." : "Purchase order has been created successfully.",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${purchaseOrderId ? 'update' : 'create'} purchase order: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Add new item
  const addItem = () => {
    const newItem: PurchaseOrderItem = {
      id: undefined,
      description: "",
      quantity: "1",
      unitCost: "0",
      taxRate: "10",
      subtotal: "0",
      taxAmount: "0",
      totalAmount: "0",
      productId: null
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    form.setValue('items', newItems);
  };

  // Remove item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
      form.setValue('items', newItems);
      updateTotals(newItems);
    }
  };

  // Update item
  const updateItem = (index: number, field: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate totals for this item
    const quantity = parseFloat(newItems[index].quantity || '0') || 0;
    const unitCost = parseFloat(newItems[index].unitCost || '0') || 0;
    const taxRate = parseFloat(newItems[index].taxRate || '0') || 0;
    
    const subtotal = quantity * unitCost;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    
    newItems[index].subtotal = subtotal.toFixed(2);
    newItems[index].taxAmount = taxAmount.toFixed(2);
    newItems[index].totalAmount = totalAmount.toFixed(2);
    
    setItems(newItems);
    form.setValue('items', newItems);
    updateTotals(newItems);
  };

  // Update totals
  const updateTotals = (currentItems: PurchaseOrderItem[]) => {
    const isFakturPajak = form.getValues('purchaseOrder.useFakturPajak');
    const taxRate = globalTaxRate;
    
    let subtotal = 0;
    let taxAmount = 0;
    
    if (isFakturPajak) {
      // Tax-inclusive pricing: stored prices include tax
      // DPP (base price) = fullPrice / (1 + taxRate/100)
      // PPN = fullPrice - DPP
      currentItems.forEach(item => {
        const fullPrice = parseFloat(item.subtotal || "0");
        const basePrice = fullPrice / (1 + taxRate / 100);
        const itemTax = fullPrice - basePrice;
        subtotal += basePrice;
        taxAmount += itemTax;
      });
    } else {
      // No tax separation - show full price only
      subtotal = currentItems.reduce((sum, item) => sum + (parseFloat(item.subtotal || "0")), 0);
      taxAmount = 0;
    }
    
    const discount = parseFloat(form.getValues('purchaseOrder.discount') || '0') || 0;
    const shipping = parseFloat(form.getValues('purchaseOrder.shipping') || '0') || 0;
    const totalAmount = subtotal + taxAmount - discount + shipping;
    
    form.setValue('purchaseOrder.subtotal', subtotal.toFixed(2));
    form.setValue('purchaseOrder.taxAmount', taxAmount.toFixed(2));
    form.setValue('purchaseOrder.taxRate', taxRate.toString());
    form.setValue('purchaseOrder.totalAmount', totalAmount.toFixed(2));
  };

  // Update product selection for item
  const selectProduct = (index: number, productId: number) => {
    const newItems = [...items];
    
    if (productId === 0) {
      // Manual entry - clear product selection and reset totals
      newItems[index] = {
        ...newItems[index],
        description: '',
        unitCost: '0',
        productId: null,
        subtotal: '0',
        taxAmount: '0',
        totalAmount: '0'
      };
    } else {
      const product = products?.find(p => p.id === productId);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          description: product.name,
          unitCost: product.costPrice || '0',
          productId: productId
        };
        
        // Recalculate totals
        const quantity = parseFloat(newItems[index].quantity || '1') || 1;
        const unitCost = parseFloat(product.costPrice || '0') || 0;
        const taxRate = parseFloat(newItems[index].taxRate || '10') || 10;
        const subtotal = quantity * unitCost;
        const taxAmount = (subtotal * taxRate) / 100;
        const totalAmount = subtotal + taxAmount;
        
        newItems[index].subtotal = subtotal.toFixed(2);
        newItems[index].taxAmount = taxAmount.toFixed(2);
        newItems[index].totalAmount = totalAmount.toFixed(2);
      }
    }
    
    setItems(newItems);
    form.setValue('items', newItems);
    updateTotals(newItems);
  };

  // Payment handlers for prepaid POs
  const handleAddPayment = () => {
    setEditingPayment(null);
    setPaymentForm({
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentType: 'Bank Transfer',
      amount: '',
      notes: ''
    });
    setPaymentDialogOpen(true);
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setPaymentForm({
      paymentDate: payment.paymentDate,
      paymentType: payment.paymentType,
      amount: payment.amount,
      notes: payment.notes || ''
    });
    setPaymentDialogOpen(true);
  };

  const handleSavePayment = async () => {
    if (!purchaseOrderId) return;
    
    try {
      if (editingPayment) {
        await apiRequest('PUT', `/api/purchase-orders/${purchaseOrderId}/payments/${editingPayment.id}`, paymentForm);
        toast({ title: "Payment updated successfully" });
      } else {
        await apiRequest('POST', `/api/purchase-orders/${purchaseOrderId}/payments`, paymentForm);
        toast({ title: "Payment added successfully" });
      }
      setPaymentDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders', purchaseOrderId, 'payments'] });
    } catch (error) {
      toast({ title: "Failed to save payment", variant: "destructive" });
    }
  };

  const handleDeletePayment = async (paymentId: number) => {
    if (!purchaseOrderId) return;
    
    try {
      await apiRequest('DELETE', `/api/purchase-orders/${purchaseOrderId}/payments/${paymentId}`);
      toast({ title: "Payment deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/purchase-orders', purchaseOrderId, 'payments'] });
    } catch (error) {
      toast({ title: "Failed to delete payment", variant: "destructive" });
    }
  };

  // Detect duplicate products in items
  const duplicateProducts = (() => {
    const productIds = items
      .filter(item => item.productId && item.productId !== null)
      .map(item => item.productId as number);
    
    const duplicates: { productId: number; productName: string; count: number }[] = [];
    const seen: Record<number, number> = {};
    
    productIds.forEach(id => {
      seen[id] = (seen[id] || 0) + 1;
    });
    
    Object.entries(seen).forEach(([id, count]) => {
      if (count > 1) {
        const product = products?.find(p => p.id === parseInt(id));
        duplicates.push({
          productId: parseInt(id),
          productName: product?.name || `Product #${id}`,
          count
        });
      }
    });
    
    return duplicates;
  })();

  const onSubmit = (values: PurchaseOrderFormValues) => {
    // Use items from state, not from form values
    const submitValues = {
      ...values,
      items: items
    };
    mutation.mutate(submitValues);
  };

  // Show loading state when fetching existing PO
  if (purchaseOrderId && isLoadingPO) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-gray-500 mt-4">Loading purchase order...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {purchaseOrderId ? 'Edit Purchase Order' : 'New Purchase Order'}
          </h1>
          {!purchaseOrderId && nextPONumber && (
            <p className="text-sm text-gray-500 mt-1">Order Number: {nextPONumber}</p>
          )}
          {purchaseOrderId && existingPO?.purchaseOrderNumber && (
            <p className="text-sm text-gray-500 mt-1">Order Number: {existingPO.purchaseOrderNumber}</p>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" type="button" onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>
      
      {/* Back Confirmation Dialog */}
      <AlertDialog open={showBackConfirmDialog} onOpenChange={setShowBackConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowBackConfirmDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={discardAndGoBack}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Supplier Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Supplier Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Supplier Dropdown */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="purchaseOrder.supplierName"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Select Supplier *</FormLabel>
                      <Popover open={supplierComboboxOpen} onOpenChange={setSupplierComboboxOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={supplierComboboxOpen}
                              className="w-full justify-between font-normal"
                              data-testid="button-select-supplier"
                            >
                              {form.watch('purchaseOrder.supplierId')
                                ? (() => {
                                    const supplier = suppliers?.find((s: any) => s.id === form.watch('purchaseOrder.supplierId'));
                                    return supplier ? `${supplier.supplierNumber ? `[${supplier.supplierNumber}] ` : ''}${supplier.name}` : field.value || '-- Select Supplier --';
                                  })()
                                : field.value || "-- Select Supplier --"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search suppliers..." data-testid="input-search-supplier" />
                            <CommandList>
                              <CommandEmpty>No supplier found.</CommandEmpty>
                              <CommandGroup>
                                {suppliers?.map((supplier: any) => (
                                  <CommandItem
                                    key={supplier.id}
                                    value={`${supplier.supplierNumber || ''} ${supplier.name}`}
                                    onSelect={() => handleSupplierSelect(supplier.id)}
                                    data-testid={`supplier-option-${supplier.id}`}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        form.watch('purchaseOrder.supplierId') === supplier.id ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {supplier.supplierNumber && <span className="text-gray-500 mr-2">[{supplier.supplierNumber}]</span>}
                                    {supplier.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="purchaseOrder.supplierEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} type="email" placeholder="supplier@example.com" readOnly className="bg-gray-50" data-testid="input-supplier-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="purchaseOrder.supplierPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} placeholder="Phone number" readOnly className="bg-gray-50" data-testid="input-supplier-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="purchaseOrder.orderDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order Date *</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        data-testid="input-order-date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseOrder.useFakturPajak"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Gunakan Faktur Pajak (PPN {globalTaxRate}%)</FormLabel>
                      <FormDescription>
                        Centang jika PO ini menggunakan faktur pajak
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseOrder.isPrepaid"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-blue-50">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Prepaid (Pembayaran di Muka)</FormLabel>
                      <FormDescription>
                        Centang jika PO ini dibayar terlebih dahulu sebelum barang datang
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="purchaseOrder.supplierAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ''} placeholder="Supplier address" readOnly className="bg-gray-50" data-testid="textarea-supplier-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Items</span>
                <Button type="button" onClick={addItem} size="sm" data-testid="button-add-item">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Duplicate product warning */}
              {duplicateProducts.length > 0 && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <span className="font-medium">Produk duplikat terdeteksi: </span>
                    {duplicateProducts.map((dup, idx) => (
                      <span key={dup.productId}>
                        {dup.productName} ({dup.count}x)
                        {idx < duplicateProducts.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                    <span className="block mt-1 text-sm">Pertimbangkan untuk menggabungkan item yang sama.</span>
                  </AlertDescription>
                </Alert>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase" style={{ width: '35%' }}>Product / Description</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase" style={{ width: '100px' }}>Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase" style={{ width: '140px' }}>Unit Cost</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase" style={{ width: '80px' }}>Tax %</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase" style={{ width: '120px' }}>Total</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase" style={{ width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <PurchaseOrderItemRow
                        key={item.id ? `item-${item.id}` : `new-${index}`}
                        index={index}
                        item={item}
                        products={products || []}
                        updateItem={(idx, field, value) => updateItem(idx, field, value)}
                        removeItem={removeItem}
                        selectProduct={selectProduct}
                        canRemove={items.length > 1}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Totals and Notes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="purchaseOrder.notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ''}
                          placeholder="Additional notes or terms..."
                          className="min-h-[120px]"
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Faktur Pajak Toggle */}
                <FormField
                  control={form.control}
                  name="purchaseOrder.useFakturPajak"
                  render={({ field }) => (
                    <div className="flex justify-between items-center py-2 border-b mb-2">
                      <div>
                        <span className="font-medium">Faktur Pajak</span>
                        <p className="text-xs text-muted-foreground">Tampilkan DPP + PPN terpisah</p>
                      </div>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          setTimeout(() => updateTotals(items), 0);
                        }}
                      />
                    </div>
                  )}
                />

                {useFakturPajak ? (
                  <>
                    {/* DPP (Base Price) - when faktur pajak is active */}
                    <div className="flex justify-between">
                      <span>DPP (Dasar Pengenaan Pajak):</span>
                      <span data-testid="text-subtotal">{formatCurrency(form.watch('purchaseOrder.subtotal') || "0")}</span>
                    </div>
                    
                    {/* PPN (Tax) - when faktur pajak is active */}
                    <div className="flex justify-between">
                      <span>PPN ({globalTaxRate}%):</span>
                      <span data-testid="text-tax">{formatCurrency(form.watch('purchaseOrder.taxAmount') || "0")}</span>
                    </div>
                  </>
                ) : (
                  /* Full price only when faktur pajak is inactive */
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span data-testid="text-subtotal">{formatCurrency(form.watch('purchaseOrder.subtotal') || "0")}</span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span>Discount:</span>
                  <FormField
                    control={form.control}
                    name="purchaseOrder.discount"
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || '0'}
                        type="number"
                        className="w-24 text-right"
                        min="0"
                        step="0.01"
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          updateTotals(items);
                        }}
                        data-testid="input-discount"
                      />
                    )}
                  />
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Shipping:</span>
                  <FormField
                    control={form.control}
                    name="purchaseOrder.shipping"
                    render={({ field }) => (
                      <Input
                        {...field}
                        value={field.value || '0'}
                        type="number"
                        className="w-24 text-right"
                        min="0"
                        step="0.01"
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          updateTotals(items);
                        }}
                        data-testid="input-shipping"
                      />
                    )}
                  />
                </div>
                
                <hr />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span data-testid="text-total-amount">{formatCurrency(form.watch('purchaseOrder.totalAmount') || "0")}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Prepaid Payments Section - Only visible when isPrepaid is enabled */}
          {isPrepaid && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Pembayaran (Prepaid)
                  </div>
                  {purchaseOrderId && (
                    <Button type="button" onClick={handleAddPayment} size="sm">
                      <Plus className="h-4 w-4 mr-1.5" />
                      Add Payment
                    </Button>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!purchaseOrderId ? (
                  <div className="text-center py-8 text-gray-500">
                    <DollarSign className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium">Simpan PO Terlebih Dahulu</p>
                    <p className="text-sm">Klik "Create Purchase Order" untuk menyimpan, lalu Anda dapat mencatat pembayaran.</p>
                  </div>
                ) : (
                  <>
                    {/* Payment Summary */}
                    {(() => {
                      const poTotal = parseFloat(form.watch('purchaseOrder.totalAmount') || '0');
                      const totalPaid = poPayments.reduce((sum: number, p: any) => sum + parseFloat(p.amount || '0'), 0);
                      const remaining = poTotal - totalPaid;
                      const paymentProgress = poTotal > 0 ? (totalPaid / poTotal) * 100 : 0;
                      const isFullyPaid = remaining <= 0;
                      
                      return (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="text-lg font-medium mb-3">Payment Summary</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Total PO</span>
                              <span className="font-medium">{formatCurrency(poTotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Sudah Dibayar</span>
                              <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Sisa</span>
                              <span className={`font-semibold ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {formatCurrency(Math.max(0, remaining))}
                              </span>
                            </div>
                            <Progress value={Math.min(100, paymentProgress)} className="h-2 mt-2" />
                          </div>
                          {isFullyPaid ? (
                            <div className="mt-3 p-2 bg-green-100 text-green-800 rounded text-sm text-center">
                              <CheckCircle className="h-4 w-4 inline mr-2" />
                              Lunas
                            </div>
                          ) : totalPaid > 0 ? (
                            <div className="mt-3 p-2 bg-orange-100 text-orange-800 rounded text-sm text-center">
                              <DollarSign className="h-4 w-4 inline mr-2" />
                              Sebagian Dibayar ({Math.round(paymentProgress)}%)
                            </div>
                          ) : (
                            <div className="mt-3 p-2 bg-red-100 text-red-800 rounded text-sm text-center">
                              <DollarSign className="h-4 w-4 inline mr-2" />
                              Belum Dibayar
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Payment Records */}
                    {poPayments.length === 0 ? (
                      <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">Belum ada pembayaran tercatat</p>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Catatan</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {poPayments.map((payment: any) => (
                              <tr key={payment.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {format(new Date(payment.paymentDate), 'dd MMM yyyy')}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">{payment.paymentType}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                                  {formatCurrency(parseFloat(payment.amount))}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">{payment.notes || '-'}</td>
                                <td className="px-4 py-3 text-sm text-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditPayment(payment)}
                                    className="mr-1"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeletePayment(payment.id)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Dialog */}
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPayment ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Pembayaran</label>
                  <Input
                    type="date"
                    value={paymentForm.paymentDate}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Pembayaran</label>
                  <Select
                    value={paymentForm.paymentType}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tipe pembayaran" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Check">Check</SelectItem>
                      <SelectItem value="Other">Lainnya</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah</label>
                  <Input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    placeholder="0"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Catatan</label>
                  <Textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    placeholder="Catatan pembayaran (opsional)"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="button" onClick={handleSavePayment}>
                  {editingPayment ? 'Update' : 'Simpan'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-save">
              <Save className="mr-2 h-4 w-4" />
              {mutation.isPending 
                ? (purchaseOrderId ? 'Updating...' : 'Creating...') 
                : (purchaseOrderId ? 'Update Purchase Order' : 'Create Purchase Order')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}