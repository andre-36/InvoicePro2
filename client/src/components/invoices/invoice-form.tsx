import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Save, Check, Plus, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertInvoiceSchema } from "@shared/schema";
import { InvoiceItemRow } from "@/components/invoices/invoice-item-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { generatePDF } from "@/lib/pdf-generator";
import { format } from "date-fns";

// Extend the schema for client-side validation
const extendedInvoiceSchema = insertInvoiceSchema.extend({
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  // Using string representation for numeric fields to work with form inputs
  subtotal: z.string().optional(),
  tax: z.string().optional(),
  discount: z.string().optional(),
  total: z.string().optional(),
});

// Schema for invoice items
const invoiceItemSchema = z.object({
  id: z.number().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.string().min(1, "Quantity is required"),
  price: z.string().min(1, "Price is required"),
  taxRate: z.string().optional(),
  subtotal: z.string().optional(),
  tax: z.string().optional(),
  total: z.string().optional(),
  productId: z.number().nullable().optional(),
});

// Schema for the complete form
const invoiceFormSchema = z.object({
  invoice: extendedInvoiceSchema,
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
type InvoiceItem = z.infer<typeof invoiceItemSchema>;

interface InvoiceFormProps {
  invoiceId?: number;
  onSuccess?: () => void;
}

export function InvoiceForm({ invoiceId, onSuccess }: InvoiceFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: undefined,
      description: "",
      quantity: "1",
      price: "0",
      taxRate: "0",
      subtotal: "0",
      tax: "0",
      total: "0",
      productId: null
    }
  ]);

  // Fetch clients for the dropdown
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Fetch products for product selection
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  // If editing an existing invoice, fetch its data
  const { data: invoiceData, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['/api/invoices', invoiceId],
    enabled: !!invoiceId,
  });

  // Generate a new invoice number (only for new invoices)
  const { data: recentInvoices } = useQuery({
    queryKey: ['/api/dashboard/recent-invoices'],
    enabled: !invoiceId,
  });

  // Form setup
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoice: {
        invoiceNumber: "",
        clientId: 0,
        userId: 0,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: "draft",
        subtotal: "0",
        tax: "0",
        discount: "0",
        total: "0",
        notes: ""
      },
      items: items
    }
  });

  // Create/update invoice mutation
  const mutation = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      // Format dates as ISO strings
      const formattedValues = {
        ...values,
        invoice: {
          ...values.invoice,
          issueDate: values.invoice.issueDate.toISOString(),
          dueDate: values.invoice.dueDate.toISOString(),
        }
      };

      if (invoiceId) {
        // Update existing invoice
        return apiRequest('PUT', `/api/invoices/${invoiceId}`, formattedValues);
      } else {
        // Create new invoice
        return apiRequest('POST', '/api/invoices', formattedValues);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-invoices'] });
      toast({
        title: invoiceId ? "Invoice updated" : "Invoice created",
        description: invoiceId ? "Your invoice has been updated successfully." : "Your invoice has been created successfully.",
      });
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${invoiceId ? "update" : "create"} invoice: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Set up the form when data is loaded
  useEffect(() => {
    if (!invoiceId && recentInvoices) {
      // Generate a new invoice number
      let lastInvoiceNumber = "INV-2023-0000";
      if (recentInvoices.length > 0) {
        lastInvoiceNumber = recentInvoices[0].invoiceNumber;
      }
      
      // Extract the number part and increment
      const matches = lastInvoiceNumber.match(/(\d+)$/);
      if (matches && matches[1]) {
        const nextNumber = (parseInt(matches[1]) + 1).toString().padStart(4, '0');
        const prefix = lastInvoiceNumber.substring(0, lastInvoiceNumber.length - matches[1].length);
        form.setValue('invoice.invoiceNumber', prefix + nextNumber);
      } else {
        form.setValue('invoice.invoiceNumber', 'INV-2023-0001');
      }
    }

    if (invoiceData) {
      // Populate form with existing invoice data
      const invoice = {
        ...invoiceData,
        issueDate: new Date(invoiceData.issueDate),
        dueDate: new Date(invoiceData.dueDate),
        subtotal: invoiceData.subtotal.toString(),
        tax: invoiceData.tax.toString(),
        discount: invoiceData.discount.toString(),
        total: invoiceData.total.toString(),
      };
      
      form.setValue('invoice', invoice);
      
      if (invoiceData.items && invoiceData.items.length > 0) {
        const formattedItems = invoiceData.items.map(item => ({
          ...item,
          quantity: item.quantity.toString(),
          price: item.price.toString(),
          taxRate: item.taxRate.toString(),
          subtotal: item.subtotal.toString(),
          tax: item.tax.toString(),
          total: item.total.toString(),
        }));
        
        setItems(formattedItems);
        form.setValue('items', formattedItems);
      }
    }
  }, [invoiceData, recentInvoices, invoiceId, form]);

  // Calculate totals whenever items change
  useEffect(() => {
    if (items.length > 0) {
      // Calculate subtotal, tax, and total
      let subtotal = 0;
      let tax = 0;
      
      items.forEach(item => {
        subtotal += parseFloat(item.subtotal || "0");
        tax += parseFloat(item.tax || "0");
      });
      
      // Apply discount
      const discountValue = parseFloat(form.getValues('invoice.discount') || "0");
      const total = subtotal + tax - discountValue;
      
      // Update form values
      form.setValue('invoice.subtotal', subtotal.toFixed(2));
      form.setValue('invoice.tax', tax.toFixed(2));
      form.setValue('invoice.total', total.toFixed(2));
      
      // Update items in the form
      form.setValue('items', items);
    }
  }, [items, form]);

  // Add a new invoice item
  const addItem = () => {
    const newItem: InvoiceItem = {
      id: undefined,
      description: "",
      quantity: "1",
      price: "0",
      taxRate: "0",
      subtotal: "0",
      tax: "0",
      total: "0",
      productId: null
    };
    
    setItems([...items, newItem]);
  };

  // Remove an invoice item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    } else {
      toast({
        title: "Error",
        description: "At least one item is required",
        variant: "destructive",
      });
    }
  };

  // Update an invoice item
  const updateItem = (index: number, updatedItem: InvoiceItem) => {
    const newItems = [...items];
    newItems[index] = updatedItem;
    setItems(newItems);
  };

  // Handle product selection
  const handleProductSelect = (index: number, productId: number | null) => {
    if (!productId || !products) return;
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const quantity = items[index].quantity;
    const price = product.price.toString();
    const taxRate = product.taxRate.toString();
    const subtotal = (parseFloat(quantity) * parseFloat(price)).toFixed(2);
    const tax = (parseFloat(subtotal) * parseFloat(taxRate) / 100).toFixed(2);
    const total = (parseFloat(subtotal) + parseFloat(tax)).toFixed(2);
    
    const updatedItem: InvoiceItem = {
      ...items[index],
      description: product.name,
      price,
      taxRate,
      subtotal,
      tax,
      total,
      productId
    };
    
    updateItem(index, updatedItem);
  };

  // Submit the form
  const onSubmit = (values: InvoiceFormValues) => {
    mutation.mutate(values);
  };

  // Save as draft or send the invoice
  const saveAsDraft = () => {
    form.setValue('invoice.status', 'draft');
    form.handleSubmit(onSubmit)();
  };

  const saveAndSend = () => {
    form.setValue('invoice.status', 'sent');
    form.handleSubmit(onSubmit)();
  };
  
  // Handle invoice PDF generation
  const handleGeneratePDF = async () => {
    if (!form.formState.isValid) {
      form.trigger();
      return;
    }
    
    const values = form.getValues();
    const client = clients?.find(c => c.id === values.invoice.clientId);
    
    if (!client) {
      toast({
        title: "Error",
        description: "Please select a client to generate PDF",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await generatePDF({
        invoice: {
          ...values.invoice,
          issueDate: format(values.invoice.issueDate, 'MMM dd, yyyy'),
          dueDate: format(values.invoice.dueDate, 'MMM dd, yyyy'),
        },
        items: values.items,
        client
      });
      
      toast({
        title: "Success",
        description: "Invoice PDF has been generated",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  // If loading invoice data, show loading state
  if (invoiceId && isLoadingInvoice) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card className="border-0 shadow-none">
          <CardHeader className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <CardTitle className="text-xl font-semibold text-gray-900">
              {invoiceId ? "Edit Invoice" : "Create New Invoice"}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onSuccess}
                className="h-9"
              >
                <X className="mr-1.5 h-4 w-4" />
                <span>Cancel</span>
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-4 md:p-6">
            <div className="space-y-6">
              {/* Invoice Details Section */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="invoice.invoiceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Number</FormLabel>
                        <FormControl>
                          <Input {...field} readOnly className="bg-gray-50" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="invoice.issueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Invoice Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} 
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="invoice.dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            value={field.value ? format(field.value, 'yyyy-MM-dd') : ''} 
                            onChange={(e) => field.onChange(new Date(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Client Section */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Client Information</h4>
                
                <div className="mb-4">
                  <FormField
                    control={form.control}
                    name="invoice.clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Client</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value.toString()}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="-- Select Client --" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              {/* Items Section */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Invoice Items</h4>
                
                <div className="overflow-x-auto border border-gray-200 rounded-lg mb-4">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-full">
                          Item / Description
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Quantity
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Price
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Tax (%)
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                          Total
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {items.map((item, index) => (
                        <InvoiceItemRow
                          key={index}
                          index={index}
                          item={item}
                          products={products || []}
                          updateItem={updateItem}
                          removeItem={removeItem}
                          onProductSelect={handleProductSelect}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                  className="mb-6"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  <span>Add Item</span>
                </Button>
              </div>
              
              {/* Totals Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="sm:w-1/2 ml-auto">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Subtotal:</span>
                      <span className="text-gray-900">${form.watch('invoice.subtotal')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Tax:</span>
                      <span className="text-gray-900">${form.watch('invoice.tax')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">Discount:</span>
                      <div className="flex items-center space-x-2">
                        <FormField
                          control={form.control}
                          name="invoice.discount"
                          render={({ field }) => (
                            <FormItem className="w-20">
                              <FormControl>
                                <Input 
                                  {...field} 
                                  type="number"
                                  min="0"
                                  className="text-right h-8"
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <span className="text-gray-900">-${form.watch('invoice.discount')}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-base pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="font-bold text-gray-900">${form.watch('invoice.total')}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Notes Section */}
              <div>
                <FormField
                  control={form.control}
                  name="invoice.notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={3}
                          placeholder="Payment terms, conditions, or additional information..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end space-x-3 p-4 md:p-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onSuccess}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleGeneratePDF}
              className="bg-gray-50 hover:bg-gray-100 text-gray-800"
            >
              Preview PDF
            </Button>
            <Button
              type="button"
              onClick={saveAsDraft}
              variant="secondary"
              disabled={mutation.isPending}
            >
              <Save className="mr-1.5 h-4 w-4" />
              <span>Save as Draft</span>
            </Button>
            <Button
              type="button"
              onClick={saveAndSend}
              disabled={mutation.isPending}
            >
              <Check className="mr-1.5 h-4 w-4" />
              <span>Save & Send</span>
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
