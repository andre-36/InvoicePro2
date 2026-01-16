import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Save, Plus, Trash2, ArrowLeft, Package, ChevronsUpDown, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertPurchaseOrderSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function PurchaseOrderForm({ purchaseOrderId, onSuccess }: PurchaseOrderFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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

  // Fetch suppliers for the dropdown
  const { data: suppliers } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
  });

  // Fetch products for product selection
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  // For new purchase orders, fetch the next PO number preview with fallback
  const { data: nextPONumberData, isError: isNumberError } = useQuery({
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
        status: "draft",
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
    const quantity = parseFloat(newItems[index].quantity) || 0;
    const unitCost = parseFloat(newItems[index].unitCost) || 0;
    const taxRate = parseFloat(newItems[index].taxRate) || 0;
    
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
    const subtotal = currentItems.reduce((sum, item) => sum + (parseFloat(item.subtotal || "0")), 0);
    const taxAmount = currentItems.reduce((sum, item) => sum + (parseFloat(item.taxAmount || "0")), 0);
    const discount = parseFloat(form.getValues('purchaseOrder.discount')) || 0;
    const shipping = parseFloat(form.getValues('purchaseOrder.shipping')) || 0;
    const totalAmount = subtotal + taxAmount - discount + shipping;
    
    form.setValue('purchaseOrder.subtotal', subtotal.toFixed(2));
    form.setValue('purchaseOrder.taxAmount', taxAmount.toFixed(2));
    form.setValue('purchaseOrder.totalAmount', totalAmount.toFixed(2));
  };

  // Update product selection for item
  const selectProduct = (index: number, productId: number) => {
    const product = products?.find(p => p.id === productId);
    if (product) {
      updateItem(index, 'description', product.name);
      updateItem(index, 'unitCost', product.cost_price || '0');
      updateItem(index, 'productId', productId.toString());
    }
  };

  const onSubmit = (values: PurchaseOrderFormValues) => {
    mutation.mutate(values);
  };

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
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>

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
                      <Input {...field} type="email" placeholder="supplier@example.com" readOnly className="bg-gray-50" data-testid="input-supplier-email" />
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
                      <Input {...field} placeholder="Phone number" readOnly className="bg-gray-50" data-testid="input-supplier-phone" />
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
                name="purchaseOrder.expectedDeliveryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Delivery Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                        data-testid="input-expected-delivery-date"
                      />
                    </FormControl>
                    <FormMessage />
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
                        <Textarea {...field} placeholder="Supplier address" readOnly className="bg-gray-50" data-testid="textarea-supplier-address" />
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
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50" data-testid={`item-row-${index}`}>
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium mb-1">Product/Description *</label>
                        <div className="space-y-2">
                          <Select onValueChange={(value) => selectProduct(index, parseInt(value))}>
                            <SelectTrigger data-testid={`select-product-${index}`}>
                              <SelectValue placeholder="Select product (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {products?.map((product) => (
                                <SelectItem key={product.id} value={product.id.toString()}>
                                  {product.name} - {formatCurrency(product.cost_price || 0)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                            placeholder="Item description"
                            data-testid={`input-description-${index}`}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Quantity *</label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          placeholder="0"
                          min="0"
                          step="any"
                          data-testid={`input-quantity-${index}`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Unit Cost *</label>
                        <Input
                          type="number"
                          value={item.unitCost}
                          onChange={(e) => updateItem(index, 'unitCost', e.target.value)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          data-testid={`input-unit-cost-${index}`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Tax Rate (%)</label>
                        <Input
                          type="number"
                          value={item.taxRate}
                          onChange={(e) => updateItem(index, 'taxRate', e.target.value)}
                          placeholder="10"
                          min="0"
                          step="0.1"
                          data-testid={`input-tax-rate-${index}`}
                        />
                      </div>
                      
                      <div className="flex flex-col justify-between">
                        <div>
                          <label className="block text-sm font-medium mb-1">Total</label>
                          <div className="text-lg font-semibold" data-testid={`text-total-${index}`}>
                            {formatCurrency(item.totalAmount || "0")}
                          </div>
                        </div>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="mt-2 text-red-600 hover:text-red-700"
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span data-testid="text-subtotal">{formatCurrency(form.watch('purchaseOrder.subtotal') || "0")}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span data-testid="text-tax">{formatCurrency(form.watch('purchaseOrder.taxAmount') || "0")}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span>Discount:</span>
                  <FormField
                    control={form.control}
                    name="purchaseOrder.discount"
                    render={({ field }) => (
                      <Input
                        {...field}
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

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>
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