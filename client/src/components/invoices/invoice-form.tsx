import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Save, Check, Plus, Trash2, ArrowLeft, Printer, DollarSign, Edit, Calendar, ChevronsUpDown, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertInvoiceSchema, insertInvoicePaymentSchema } from "@shared/schema";
import type { InvoicePayment } from "@shared/schema";
import { InvoiceItemRow } from "@/components/invoices/invoice-item-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { generatePDF } from "@/lib/pdf-generator";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

// Extend the schema for client-side validation
const extendedInvoiceSchema = insertInvoiceSchema.extend({
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  // Using string representation for numeric fields to work with form inputs
  subtotal: z.string().optional(),
  tax: z.string().optional(),
  discount: z.string().optional(),
  total: z.string().optional(),
  useFakturPajak: z.boolean().optional(),
  taxRate: z.string().optional(),
  deliveryType: z.enum(['self_pickup', 'delivery', 'combination']).optional(),
});

// For editing existing invoices, we need to include the invoice number for display
const editingInvoiceSchema = extendedInvoiceSchema.extend({
  invoiceNumber: z.string(),
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
  productUnitId: z.number().nullable().optional(),
});

// Schema for the complete form - conditional based on whether editing
const getInvoiceFormSchema = (isEditing: boolean) => z.object({
  invoice: isEditing ? editingInvoiceSchema : extendedInvoiceSchema,
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

type InvoiceFormValues = {
  invoice: any;
  items: InvoiceItem[];
};
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
      productId: null,
      productUnitId: null
    }
  ]);

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<InvoicePayment | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentType: 'Cash',
    amount: '',
    notes: ''
  });
  
  // Client combobox state
  const [clientComboboxOpen, setClientComboboxOpen] = useState(false);
  
  // Track if user has made changes (for back confirmation)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showBackConfirmDialog, setShowBackConfirmDialog] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState<number | null>(null);

  // Fetch clients for the dropdown
  const { data: clients } = useQuery({
    queryKey: ['/api/clients'],
  });

  // Fetch all products for product selection
  const { data: products } = useQuery({
    queryKey: ['/api/products'],
  });

  // Fetch payment terms from settings
  const { data: paymentTermsData = [] } = useQuery<{ id: number; code: string; name: string; days: number; description?: string; isActive: boolean }[]>({
    queryKey: ['/api/payment-terms'],
  });

  // Fetch invoice payments if editing an existing invoice
  const { data: invoicePayments = [] } = useQuery<InvoicePayment[]>({
    queryKey: ['/api/invoices', invoiceId, 'payments'],
    enabled: !!invoiceId,
  });

  // Fetch current user for default notes and tax rate
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/user'],
  });

  // Mutation for creating a payment
  const createPaymentMutation = useMutation({
    mutationFn: async (payment: any) => {
      return await apiRequest(`/api/invoices/${invoiceId}/payments`, 'POST', payment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId, 'payments'] });
      toast({ title: "Success", description: "Payment added successfully" });
      setPaymentDialogOpen(false);
      setPaymentForm({ paymentDate: format(new Date(), 'yyyy-MM-dd'), paymentType: 'Cash', amount: '', notes: '' });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to add payment: ${error.message}`, variant: "destructive" });
    }
  });

  // Mutation for updating a payment
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ id, payment }: { id: number; payment: any }) => {
      return await apiRequest(`/api/invoices/${invoiceId}/payments/${id}`, 'PUT', payment);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId, 'payments'] });
      toast({ title: "Success", description: "Payment updated successfully" });
      setPaymentDialogOpen(false);
      setEditingPayment(null);
      setPaymentForm({ paymentDate: format(new Date(), 'yyyy-MM-dd'), paymentType: 'Cash', amount: '', notes: '' });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to update payment: ${error.message}`, variant: "destructive" });
    }
  });

  // Mutation for deleting a payment
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: number) => {
      return await apiRequest(`/api/invoices/${invoiceId}/payments/${paymentId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices', invoiceId, 'payments'] });
      toast({ title: "Success", description: "Payment deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to delete payment: ${error.message}`, variant: "destructive" });
    }
  });

  // If editing an existing invoice, fetch its data
  const { data: invoiceData, isLoading: isLoadingInvoice } = useQuery({
    queryKey: ['/api/invoices', invoiceId],
    enabled: !!invoiceId,
  });

  // For new invoices, fetch the next invoice number preview with fallback
  const { data: nextInvoiceNumberData, isError: isNumberError } = useQuery({
    queryKey: ['/api/invoices/next-number'],
    enabled: !invoiceId, // Only for new invoices
  });

  // Generate fallback invoice number if API fails
  const generateFallbackInvoiceNumber = () => {
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    return `INV-${year}${month}-0001`;
  };

  const nextInvoiceNumber = nextInvoiceNumberData?.invoiceNumber || 
    (isNumberError ? generateFallbackInvoiceNumber() : null);

  // Form setup with conditional schema
  const invoiceFormSchema = getInvoiceFormSchema(!!invoiceId);
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoice: {
        ...(invoiceId && { invoiceNumber: "" }),
        storeId: 1,
        clientId: 0,
        paymentTerms: "net_30",
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: "draft",
        totalAmount: "0",
        subtotal: "0",
        tax: "0",
        discount: "0",
        total: "0",
        notes: "",
        useFakturPajak: false,
        taxRate: "11",
        deliveryType: "delivery" as "self_pickup" | "delivery" | "combination"
      },
      items: items
    }
  });

  // Helper function to calculate due date based on payment terms
  const calculateDueDate = (issueDate: Date, paymentTermsCode: string): Date => {
    const date = new Date(issueDate);
    
    // Check if it's "custom" - don't auto-calculate
    if (paymentTermsCode === 'custom') {
      return date;
    }
    
    // Find the payment term from API data by code
    const term = paymentTermsData.find(t => t.code === paymentTermsCode);
    
    if (term) {
      date.setDate(date.getDate() + term.days);
    }
    
    return date;
  };

  // Watch for changes to issueDate and paymentTerms to auto-update dueDate
  const watchIssueDate = form.watch('invoice.issueDate');
  const watchPaymentTerms = form.watch('invoice.paymentTerms');

  useEffect(() => {
    // Only auto-calculate if not custom payment terms AND payment terms data is loaded
    if (watchPaymentTerms && watchPaymentTerms !== 'custom' && watchIssueDate && paymentTermsData.length > 0) {
      const term = paymentTermsData.find(t => t.code === watchPaymentTerms);
      if (term) {
        const newDueDate = calculateDueDate(watchIssueDate, watchPaymentTerms);
        form.setValue('invoice.dueDate', newDueDate);
      }
    }
  }, [watchIssueDate, watchPaymentTerms, paymentTermsData]);

  // Create/update invoice mutation (navigates away after success)
  const mutation = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      // Format dates as ISO strings
      let invoiceData = {
        ...values.invoice,
        issueDate: values.invoice.issueDate.toISOString(),
        dueDate: values.invoice.dueDate.toISOString(),
      };

      const formattedValues = {
        ...values,
        invoice: invoiceData
      };

      const currentId = invoiceId || savedInvoiceId;
      if (currentId) {
        return apiRequest('PUT', `/api/invoices/${currentId}`, formattedValues);
      } else {
        return apiRequest('POST', '/api/invoices', formattedValues);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-invoices'] });
      setHasUnsavedChanges(false);
      toast({
        title: invoiceId ? "Invoice updated" : "Invoice created",
        description: invoiceId ? "Your invoice has been updated successfully." : "Your invoice has been created successfully.",
      });
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 100);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${invoiceId ? "update" : "create"} invoice: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Save draft mutation (stays on page after success)
  const saveDraftMutation = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      let invoiceData = {
        ...values.invoice,
        issueDate: values.invoice.issueDate.toISOString(),
        dueDate: values.invoice.dueDate.toISOString(),
        status: 'draft'
      };

      const formattedValues = {
        ...values,
        invoice: invoiceData
      };

      const currentId = invoiceId || savedInvoiceId;
      if (currentId) {
        return apiRequest('PUT', `/api/invoices/${currentId}`, formattedValues);
      } else {
        return apiRequest('POST', '/api/invoices', formattedValues);
      }
    },
    onSuccess: async (response: any) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/dashboard/recent-invoices'] });
      setHasUnsavedChanges(false);
      
      // If this was a new invoice, store the ID so subsequent saves update the same invoice
      if (!invoiceId && !savedInvoiceId && response?.id) {
        setSavedInvoiceId(response.id);
      }
      
      toast({
        title: "Invoice saved",
        description: "Your invoice has been saved as draft.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save invoice: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Set up the form when data is loaded  
  useEffect(() => {
    if (invoiceData) {
      // Populate form with existing invoice data
      const invoice = {
        ...invoiceData,
        paymentTerms: invoiceData.paymentTerms || 'custom', // Default to custom for existing invoices without paymentTerms
        issueDate: new Date(invoiceData.issueDate),
        dueDate: new Date(invoiceData.dueDate),
        subtotal: invoiceData.subtotal.toString(),
        tax: invoiceData.tax.toString(),
        discount: invoiceData.discount.toString(),
        total: invoiceData.total.toString(),
        useFakturPajak: invoiceData.useFakturPajak || false,
        taxRate: invoiceData.taxRate?.toString() || currentUser?.defaultTaxRate || "11",
        deliveryType: invoiceData.deliveryType || "delivery",
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
  }, [invoiceData, invoiceId, form]);

  // Watch faktur pajak toggle
  const watchUseFakturPajak = form.watch('invoice.useFakturPajak');
  const watchTaxRate = form.watch('invoice.taxRate');
  const watchDiscount = form.watch('invoice.discount');

  // Calculate totals whenever items or tax settings change
  useEffect(() => {
    if (items.length > 0) {
      // Sum up all item totals (these are the full prices including tax if applicable)
      let itemsTotal = 0;
      items.forEach(item => {
        itemsTotal += parseFloat(item.subtotal || "0");
      });

      // Apply discount
      const discountValue = parseFloat(watchDiscount || "0");

      // Get tax rate from user settings or form
      const taxRate = parseFloat(watchTaxRate || currentUser?.defaultTaxRate || "11") || 11;
      const taxMultiplier = 1 + (taxRate / 100);

      let subtotal: number;
      let taxAmount: number;
      let total: number;

      if (watchUseFakturPajak) {
        // When using faktur pajak, prices are tax-inclusive
        // Calculate base subtotal by dividing by tax multiplier
        subtotal = itemsTotal / taxMultiplier;
        taxAmount = itemsTotal - subtotal;
        total = itemsTotal - discountValue;
      } else {
        // No tax - subtotal equals items total, no separate tax
        subtotal = itemsTotal;
        taxAmount = 0;
        total = subtotal - discountValue;
      }

      // Update form values
      form.setValue('invoice.subtotal', subtotal.toFixed(2));
      form.setValue('invoice.tax', taxAmount.toFixed(2));
      form.setValue('invoice.taxRate', taxRate.toString());
      form.setValue('invoice.total', total.toFixed(2));

      // Update items in the form
      form.setValue('items', items);
    }
  }, [items, form, watchUseFakturPajak, watchTaxRate, watchDiscount, currentUser]);

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
      productId: null,
      productUnitId: null
    };

    setItems([...items, newItem]);
    setHasUnsavedChanges(true);
  };

  // Remove an invoice item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
      setHasUnsavedChanges(true);
    } else {
      toast({
        title: "Error",
        description: "At least one item is required",
        variant: "destructive",
      });
    }
  };

  // Update an invoice item
  const updateItem = (index: number, field: keyof InvoiceItem, value: string) => {
    setItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };

      // Recalculate totals when quantity, price, or taxRate changes
      if (field === 'quantity' || field === 'price' || field === 'taxRate') {
        const quantity = parseFloat(newItems[index].quantity) || 0;
        const price = parseFloat(newItems[index].price) || 0;
        const taxRate = parseFloat(newItems[index].taxRate) || 0;

        const subtotal = quantity * price;
        const tax = (subtotal * taxRate) / 100;
        const total = subtotal + tax;

        newItems[index].subtotal = subtotal.toFixed(2);
        newItems[index].tax = tax.toFixed(2);
        newItems[index].total = total.toFixed(2);
      }

      return newItems;
    });
    setHasUnsavedChanges(true);
  };

  // Handle product selection
  const handleProductSelect = (index: number, productId: number | null, productUnitId?: number | null) => {
    if (!productId || !products) {
      // If null is passed, clear the item's product-related fields
      if (productId === null) {
        const updatedItem: InvoiceItem = {
          ...items[index],
          description: "",
          price: "0",
          taxRate: "0",
          subtotal: "0",
          tax: "0",
          total: "0",
          productId: null,
          productUnitId: null,
        };
        updateItem(index, 'description', ''); // Clear description too
        setItems(prevItems => {
          const newItems = [...prevItems];
          newItems[index] = updatedItem;
          return newItems;
        });
        setHasUnsavedChanges(true);
      }
      return;
    }


    const product = products.find(p => p.id === productId);
    if (!product) {
      console.error(`Product with id ${productId} not found`);
      return;
    }

    try {
      const quantity = items[index].quantity || "1";
      // Use currentSellingPrice if available, otherwise fall back to price
      const price = (product.currentSellingPrice || product.price || "0").toString();
      const taxRate = "0"; // Default to 0% tax
      const subtotal = (parseFloat(quantity) * parseFloat(price)).toFixed(2);
      const tax = (parseFloat(subtotal) * parseFloat(taxRate) / 100).toFixed(2);
      const total = (parseFloat(subtotal) + parseFloat(tax)).toFixed(2);

      const updatedItem: InvoiceItem = {
        ...items[index],
        description: product.name || `Product ${productId}`,
        price,
        taxRate,
        subtotal,
        tax,
        total,
        productId,
        productUnitId: productUnitId ?? null
      };

      console.log('Setting item at index', index, ':', updatedItem);
      
      // Update the items state with the complete updated item
      setItems(prevItems => {
        const newItems = [...prevItems];
        newItems[index] = updatedItem;
        return newItems;
      });
      setHasUnsavedChanges(true);

    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "Error",
        description: "Failed to update item with product data",
        variant: "destructive",
      });
    }
  };

  // Payment handlers
  const handleAddPayment = () => {
    if (!invoiceId) {
      toast({
        title: "Info",
        description: "Please save the invoice first before adding payments",
        variant: "default",
      });
      return;
    }
    setEditingPayment(null);
    setPaymentForm({ paymentDate: format(new Date(), 'yyyy-MM-dd'), paymentType: 'Cash', amount: '', notes: '' });
    setPaymentDialogOpen(true);
  };

  const handleEditPayment = (payment: InvoicePayment) => {
    setEditingPayment(payment);
    setPaymentForm({
      paymentDate: payment.paymentDate,
      paymentType: payment.paymentType,
      amount: payment.amount,
      notes: payment.notes || ''
    });
    setPaymentDialogOpen(true);
  };

  const handleDeletePayment = (paymentId: number) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      deletePaymentMutation.mutate(paymentId);
    }
  };

  const handlePaymentSubmit = () => {
    const paymentData = {
      paymentDate: paymentForm.paymentDate,
      paymentType: paymentForm.paymentType,
      amount: paymentForm.amount,
      notes: paymentForm.notes
    };

    if (editingPayment) {
      updatePaymentMutation.mutate({ id: editingPayment.id, payment: paymentData });
    } else {
      createPaymentMutation.mutate(paymentData);
    }
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

  const saveAndSend = async () => {
    try {
      console.log('=== SAVE AND SEND CALLED ===');

      // Use state items instead of form values since state is updated in real-time
      console.log('Items from state:', JSON.stringify(items, null, 2));
      console.log('Number of items:', items.length);

      // Filter out empty rows (rows with no description)
      const nonEmptyItems = items.filter(item => {
        const hasDescription = item.description && item.description.trim() !== '';
        console.log(`Item description="${item.description}", hasDescription=${hasDescription}`);
        return hasDescription;
      });

      console.log('Non-empty items count:', nonEmptyItems.length);
      console.log('Non-empty items:', JSON.stringify(nonEmptyItems, null, 2));

      // Check if there's at least one item
      if (nonEmptyItems.length === 0) {
        console.log('ERROR: No non-empty items found!');
        toast({
          title: "Please Add Items",
          description: "Add at least one item to the invoice before creating.",
          variant: "destructive",
        });
        return;
      }

      // Validate invoice fields
      const invoiceData = form.getValues('invoice');
      console.log('Client ID:', invoiceData.clientId);

      if (!invoiceData.clientId || invoiceData.clientId === 0) {
        toast({
          title: "Please Select Client",
          description: "Select a client before creating the invoice.",
          variant: "destructive",
        });
        return;
      }

      console.log('Calling mutation directly...');

      // Transform items to match database schema
      const transformedItems = nonEmptyItems.map(item => ({
        productId: item.productId || 0,
        productUnitId: item.productUnitId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.price,
        taxRate: item.taxRate,
        taxAmount: item.tax,
        discount: "0",
        subtotal: item.subtotal,
        totalAmount: item.total
      }));

      // Call mutation directly with validated data
      const formData = {
        invoice: {
          ...invoiceData,
          status: 'sent'
        },
        items: transformedItems
      };

      mutation.mutate(formData);
    } catch (error) {
      console.error('Error in saveAndSend:', error);
      toast({
        title: "Error",
        description: `An error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleBackClick = () => {
    // Check if there are actual meaningful changes (not just empty form)
    const invoiceData = form.getValues('invoice');
    const hasClient = invoiceData.clientId && invoiceData.clientId !== 0;
    const hasNonEmptyItems = items.some(item => item.description && item.description.trim() !== '');
    const hasMeaningfulData = hasClient || hasNonEmptyItems;
    
    // Show confirmation only if there are unsaved changes AND meaningful data entered
    if (hasUnsavedChanges && hasMeaningfulData) {
      setShowBackConfirmDialog(true);
    } else {
      onSuccess?.();
    }
  };

  // Save as draft without navigating away
  const saveDraft = async () => {
    try {
      const invoiceData = form.getValues('invoice');

      // Filter out empty rows (rows with no description)
      const nonEmptyItems = items.filter(item => {
        return item.description && item.description.trim() !== '';
      });

      // For draft, allow saving if there's at least some content (client OR items)
      const hasClient = invoiceData.clientId && invoiceData.clientId !== 0;
      const hasItems = nonEmptyItems.length > 0;

      if (!hasClient && !hasItems) {
        toast({
          title: "Nothing to Save",
          description: "Please add a client or at least one item before saving.",
          variant: "destructive",
        });
        return;
      }

      // Transform items to match database schema (same as saveAndSend)
      const transformedItems = nonEmptyItems.map(item => ({
        productId: item.productId || 0,
        productUnitId: item.productUnitId || null,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.price,
        taxRate: item.taxRate,
        taxAmount: item.tax,
        discount: "0",
        subtotal: item.subtotal,
        totalAmount: item.total
      }));

      const formData = {
        invoice: {
          ...invoiceData,
          // Use null as clientId if not selected (database allows null for drafts)
          clientId: hasClient ? invoiceData.clientId : null,
          status: 'draft'
        },
        items: transformedItems
      };

      saveDraftMutation.mutate(formData);
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: `An error occurred while saving: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  // Discard changes and go back
  const discardAndGoBack = () => {
    setShowBackConfirmDialog(false);
    setHasUnsavedChanges(false);
    onSuccess?.();
  };

  // Save and go back
  const saveAndGoBack = async () => {
    setShowBackConfirmDialog(false);
    await saveDraft();
    // Wait a bit then navigate
    setTimeout(() => {
      onSuccess?.();
    }, 500);
  };

  // Handle invoice PDF generation
  const handleGeneratePDF = async () => {
    if (!form.formState.isValid) {
      form.trigger();
      return;
    }

    const values = form.getValues();

    // Check if clients data is loaded
    if (!clients || !Array.isArray(clients)) {
      toast({
        title: "Error",
        description: "Client data is not available yet. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    // Find the selected client
    const client = clients.find(c => c.id === values.invoice.clientId);

    if (!client) {
      toast({
        title: "Error",
        description: "Please select a client to generate PDF",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare safe data for PDF
      const safeClient = {
        name: client.name || "Client Name",
        email: client.email || "client@example.com",
        phone: client.phone,
        address: client.address,
        taxNumber: client.taxNumber,
      };

      const safeInvoice = {
        invoiceNumber: values.invoice.invoiceNumber || `INV-${Date.now()}`,
        issueDate: format(values.invoice.issueDate || new Date(), 'MMM dd, yyyy'),
        dueDate: format(values.invoice.dueDate || new Date(), 'MMM dd, yyyy'),
        status: values.invoice.status || "draft",
        subtotal: values.invoice.subtotal || "0",
        tax: values.invoice.tax || "0",
        discount: values.invoice.discount || "0",
        total: values.invoice.total || "0",
        notes: values.invoice.notes || currentUser?.invoiceNotes || currentUser?.defaultNotes,
        useFakturPajak: values.invoice.useFakturPajak || false,
        taxRate: values.invoice.taxRate || globalTaxRate,
      };

      console.log("Generating PDF with:", { 
        invoice: safeInvoice,
        items: values.items,
        client: safeClient
      });

      await generatePDF({
        invoice: safeInvoice,
        items: values.items || [],
        client: safeClient
      });

      toast({
        title: "Success",
        description: "Invoice PDF has been generated",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
        <Card className="border-0 shadow-none w-full">
          <CardHeader className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 sticky top-0 bg-white/95 backdrop-blur-sm border-b z-10 dark:bg-gray-900/95">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
              className="h-9"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-xl font-semibold text-gray-900">
              {invoiceId ? "Edit Invoice" : "Create New Invoice"}
            </CardTitle>
            <div className="w-9"></div> {/* Spacer to center title */}
          </CardHeader>

          <CardContent className="p-4 md:p-6">
            <Tabs defaultValue="invoice" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="invoice">Invoice Details</TabsTrigger>
                <TabsTrigger value="payments">
                  Payments {invoiceId && invoicePayments.length > 0 && `(${invoicePayments.length})`}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="invoice" className="space-y-6">
                {/* Invoice Details Section */}
                <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Invoice Number field - auto-generated for new invoices, display for existing */}
                  <FormItem>
                    <FormLabel>Invoice Number</FormLabel>
                    <FormControl>
                      <Input 
                        value={invoiceId ? (invoiceData?.invoiceNumber || "") : (nextInvoiceNumber || generateFallbackInvoiceNumber())}
                        readOnly 
                        className="bg-gray-50 dark:bg-gray-800" 
                        data-testid="input-invoice-number"
                      />
                    </FormControl>
                  </FormItem>

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
                    name="invoice.paymentTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Terms</FormLabel>
                        <Select 
                          onValueChange={(value) => {
                            field.onChange(value);
                          }} 
                          value={field.value || "net_30"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment terms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {paymentTermsData.filter(term => term.isActive && term.code !== 'custom').map((term) => (
                              <SelectItem key={term.id} value={term.code}>
                                {term.name}{term.days > 0 ? ` (${term.days} Days)` : ''}
                              </SelectItem>
                            ))}
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
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
                            onChange={(e) => {
                              field.onChange(new Date(e.target.value));
                              // If user manually changes due date, switch to custom
                              if (watchPaymentTerms !== 'custom') {
                                form.setValue('invoice.paymentTerms', 'custom');
                              }
                            }}
                            disabled={watchPaymentTerms !== 'custom'}
                            className={watchPaymentTerms !== 'custom' ? 'bg-gray-50 dark:bg-gray-800' : ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Faktur Pajak Toggle */}
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="invoice.useFakturPajak"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Faktur Pajak (PPN {currentUser?.defaultTaxRate || "11"}%)</FormLabel>
                          <FormDescription>
                            Tampilkan DPP + PPN terpisah
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {/* Delivery Type Selection */}
                <div className="mt-4">
                  <FormField
                    control={form.control}
                    name="invoice.deliveryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipe Pengambilan</FormLabel>
                        <Select
                          value={field.value || "delivery"}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih tipe pengambilan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="self_pickup">Self Pickup (Ambil Sendiri)</SelectItem>
                            <SelectItem value="delivery">Delivery (Pengiriman)</SelectItem>
                            <SelectItem value="combination">Combination (Sebagian Ambil, Sebagian Kirim)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {field.value === 'self_pickup' 
                            ? 'Customer mengambil barang sendiri, tidak perlu surat jalan' 
                            : 'Perlu membuat surat jalan (delivery note)'}
                        </FormDescription>
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
                      <FormItem className="flex flex-col">
                        <FormLabel>Select Client</FormLabel>
                        <Popover open={clientComboboxOpen} onOpenChange={setClientComboboxOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={clientComboboxOpen}
                                className="w-full justify-between font-normal"
                                data-testid="button-select-client"
                              >
                                {field.value && field.value !== 0
                                  ? (() => {
                                      const client = clients?.find((c: any) => c.id === field.value);
                                      return client ? `${client.clientNumber ? `[${client.clientNumber}] ` : ''}${client.name}` : '';
                                    })()
                                  : "-- Select Client --"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[400px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search clients..." data-testid="input-search-client" />
                              <CommandList>
                                <CommandEmpty>No client found.</CommandEmpty>
                                <CommandGroup>
                                  {clients?.map((client: any) => (
                                    <CommandItem
                                      key={client.id}
                                      value={`${client.clientNumber || ''} ${client.name}`}
                                      onSelect={() => {
                                        field.onChange(client.id);
                                        setClientComboboxOpen(false);
                                      }}
                                      data-testid={`client-option-${client.id}`}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          field.value === client.id ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      {client.clientNumber && <span className="text-gray-500 mr-2">[{client.clientNumber}]</span>}
                                      {client.name}
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
              </div>

              {/* Items Section */}
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Invoice Items</h4>

                <div className="overflow-x-auto mb-4 invoice-table-container">
                  <table className="excel-table min-w-full">
                    <thead>
                      <tr>
                        <th scope="col" className="excel-header-cell text-center" style={{ width: '40px' }}>
                          #
                        </th>
                        <th scope="col" className="excel-header-cell text-left" style={{ width: '35%' }}>
                          Item / Description
                        </th>
                        <th scope="col" className="excel-header-cell text-center" style={{ width: '100px' }}>
                          Unit
                        </th>
                        <th scope="col" className="excel-header-cell text-right" style={{ width: '80px' }}>
                          Quantity
                        </th>
                        <th scope="col" className="excel-header-cell text-right" style={{ width: '120px' }}>
                          Unit Price
                        </th>
                        <th scope="col" className="excel-header-cell text-right" style={{ width: '80px' }}>
                          Tax (%)
                        </th>
                        <th scope="col" className="excel-header-cell text-right" style={{ width: '120px' }}>
                          Subtotal
                        </th>
                        <th scope="col" className="excel-header-cell text-center" style={{ width: '50px' }}>
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <InvoiceItemRow
                          key={index}
                          index={index}
                          item={item}
                          products={(products || []).filter(p => p.isActive !== false)}
                          updateItem={(idx, updatedItem) => {
                            setItems(prevItems => {
                              const newItems = [...prevItems];
                              newItems[idx] = updatedItem;
                              return newItems;
                            });
                            setHasUnsavedChanges(true);
                          }}
                          removeItem={removeItem}
                          onProductSelect={handleProductSelect}
                        />
                      ))}
                      {/* Add row button inside the table */}
                      <tr>
                        <td colSpan={8} className="px-3 py-2 border-t border-gray-200">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={addItem}
                            className="w-full text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            <Plus className="h-4 w-4 mr-1.5" />
                            <span>Add New Row</span>
                          </Button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Section */}
              <div className="border-t border-gray-200 pt-4">
                <div className="sm:w-1/2 ml-auto">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-gray-700">
                        {watchUseFakturPajak ? 'DPP (Dasar Pengenaan Pajak):' : 'Subtotal:'}
                      </span>
                      <span className="text-gray-900">{formatCurrency(parseFloat(form.watch('invoice.subtotal') || '0'))}</span>
                    </div>
                    {watchUseFakturPajak && (
                      <div className="flex justify-between text-sm">
                        <span className="font-medium text-gray-700">
                          PPN ({currentUser?.defaultTaxRate || "11"}%):
                        </span>
                        <span className="text-gray-900">{formatCurrency(parseFloat(form.watch('invoice.tax') || '0'))}</span>
                      </div>
                    )}
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
                        <span className="text-gray-900">-{formatCurrency(parseFloat(form.watch('invoice.discount') || '0'))}</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-base pt-2 border-t border-gray-200">
                      <span className="font-semibold text-gray-900">Total:</span>
                      <span className="font-bold text-gray-900">{formatCurrency(parseFloat(form.watch('invoice.total') || '0'))}</span>
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
              </TabsContent>

              <TabsContent value="payments" className="space-y-4">
                {!invoiceId ? (
                  <div className="text-center py-12 text-gray-500">
                    <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium text-gray-700 mb-2">Save Invoice First</p>
                    <p className="text-sm">You need to save this invoice before you can record payments.</p>
                    <p className="text-sm">Click "Create Invoice" or "Update Invoice" to save your changes.</p>
                  </div>
                ) : (
                  <>
                    {/* Payment Summary Infographic */}
                    {(() => {
                      const invoiceTotal = parseFloat(form.watch('invoice.total') || '0');
                      const totalPaid = invoicePayments.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0);
                      const remaining = invoiceTotal - totalPaid;
                      const paymentProgress = invoiceTotal > 0 ? (totalPaid / invoiceTotal) * 100 : 0;
                      const isFullyPaid = remaining <= 0;
                      
                      return (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <h4 className="text-lg font-medium mb-3">Payment Summary</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Invoice Total</span>
                              <span className="font-medium">{formatCurrency(invoiceTotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Total Paid</span>
                              <span className="font-medium text-green-600">{formatCurrency(totalPaid)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Remaining</span>
                              <span className={`font-semibold ${remaining > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                {formatCurrency(Math.max(0, remaining))}
                              </span>
                            </div>
                            <Progress value={Math.min(100, paymentProgress)} className="h-2 mt-2" />
                          </div>
                          {isFullyPaid ? (
                            <div className="mt-3 p-2 bg-green-100 text-green-800 rounded text-sm text-center">
                              <CheckCircle className="h-4 w-4 inline mr-2" />
                              Fully Paid
                            </div>
                          ) : totalPaid > 0 ? (
                            <div className="mt-3 p-2 bg-orange-100 text-orange-800 rounded text-sm text-center">
                              <DollarSign className="h-4 w-4 inline mr-2" />
                              Partially Paid ({Math.round(paymentProgress)}%)
                            </div>
                          ) : (
                            <div className="mt-3 p-2 bg-red-100 text-red-800 rounded text-sm text-center">
                              <DollarSign className="h-4 w-4 inline mr-2" />
                              Unpaid
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-medium text-gray-900">Payment Records</h4>
                      <Button
                        type="button"
                        onClick={handleAddPayment}
                        size="sm"
                        data-testid="button-add-payment"
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add Payment
                      </Button>
                    </div>

                    {invoicePayments.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <DollarSign className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                        <p>No payments recorded yet</p>
                        <p className="text-sm">Click "Add Payment" to record a payment</p>
                      </div>
                    ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoicePayments.map((payment) => (
                          <tr key={payment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
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
                                data-testid={`button-edit-payment-${payment.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePayment(payment.id)}
                                className="text-red-600 hover:text-red-700"
                                data-testid={`button-delete-payment-${payment.id}`}
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

                    {/* Payment Dialog */}
                    <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingPayment ? 'Edit Payment' : 'Add Payment'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                        <Input
                          type="date"
                          value={paymentForm.paymentDate}
                          onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                          data-testid="input-payment-date"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                        <Select
                          value={paymentForm.paymentType}
                          onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentType: value })}
                        >
                          <SelectTrigger data-testid="select-payment-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Check">Check</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                        <Input
                          type="number"
                          step="0.01"
                          value={paymentForm.amount}
                          onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                          placeholder="0.00"
                          data-testid="input-payment-amount"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <Textarea
                          value={paymentForm.notes}
                          onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                          rows={2}
                          placeholder="Optional notes..."
                          data-testid="input-payment-notes"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setPaymentDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handlePaymentSubmit}
                        disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}
                        data-testid="button-save-payment"
                      >
                        {editingPayment ? 'Update Payment' : 'Add Payment'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex justify-end space-x-3 p-4 md:p-6 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleGeneratePDF}
              disabled={mutation.isPending || saveDraftMutation.isPending}
            >
              <Printer className="mr-1.5 h-4 w-4" />
              <span>Print</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={(e) => {
                e.preventDefault();
                saveDraft();
              }}
              disabled={mutation.isPending || saveDraftMutation.isPending}
            >
              <Save className="mr-1.5 h-4 w-4" />
              <span>Save Draft</span>
            </Button>
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                console.log('Create Invoice button clicked');
                saveAndSend();
              }}
              disabled={mutation.isPending || saveDraftMutation.isPending}
            >
              <Check className="mr-1.5 h-4 w-4" />
              <span>{invoiceId || savedInvoiceId ? 'Update & Send' : 'Create & Send'}</span>
            </Button>
          </CardFooter>

          {/* Back confirmation dialog */}
          <AlertDialog open={showBackConfirmDialog} onOpenChange={setShowBackConfirmDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Perubahan Belum Disimpan</AlertDialogTitle>
                <AlertDialogDescription>
                  Anda memiliki perubahan yang belum disimpan. Apakah Anda ingin menyimpan sebelum keluar?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel onClick={() => setShowBackConfirmDialog(false)}>
                  Batal
                </AlertDialogCancel>
                <Button variant="destructive" onClick={discardAndGoBack}>
                  Buang Perubahan
                </Button>
                <AlertDialogAction onClick={saveAndGoBack}>
                  Simpan & Keluar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </form>
    </Form>
  );
}