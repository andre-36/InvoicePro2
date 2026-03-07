import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FolderPlus, FolderEdit, FolderMinus, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { useStore } from '@/lib/store-context';

const paymentTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  storeId: z.number().default(1)
});

const paymentTermSchema = z.object({
  name: z.string().min(1, "Name is required"),
  days: z.number().min(0, "Days must be 0 or greater"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  storeId: z.number().default(1)
});

type PaymentTypeFormData = z.infer<typeof paymentTypeSchema>;
type PaymentTermFormData = z.infer<typeof paymentTermSchema>;

export default function PaymentMethodsPage() {
  const { currentStoreId } = useStore();

  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isTermDialogOpen, setIsTermDialogOpen] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [editingTermId, setEditingTermId] = useState<number | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const typeForm = useForm<PaymentTypeFormData>({
    resolver: zodResolver(paymentTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
      storeId: currentStoreId
    }
  });

  const termForm = useForm<PaymentTermFormData>({
    resolver: zodResolver(paymentTermSchema),
    defaultValues: {
      name: "",
      days: 0,
      description: "",
      isActive: true,
      storeId: currentStoreId
    }
  });

  const { data: paymentTypes, isLoading: typesLoading } = useQuery({
    queryKey: [`/api/stores/${currentStoreId}/payment-types`],
  });

  const { data: paymentTerms, isLoading: termsLoading } = useQuery({
    queryKey: [`/api/stores/${currentStoreId}/payment-terms`],
  });

  // Payment Type Mutations
  const createTypeMutation = useMutation({
    mutationFn: async (data: PaymentTypeFormData) => {
      return apiRequest('POST', '/api/payment-types', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${currentStoreId}/payment-types`] });
      toast({ title: "Success", description: "Payment type created successfully" });
      setIsTypeDialogOpen(false);
      typeForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create payment type", variant: "destructive" });
    }
  });

  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PaymentTypeFormData> }) => {
      return apiRequest('PUT', `/api/payment-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${currentStoreId}/payment-types`] });
      toast({ title: "Success", description: "Payment type updated successfully" });
      setIsTypeDialogOpen(false);
      setEditingTypeId(null);
      typeForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update payment type", variant: "destructive" });
    }
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/payment-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${currentStoreId}/payment-types`] });
      toast({ title: "Success", description: "Payment type deleted successfully" });
      setSelectedTypeId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete payment type", variant: "destructive" });
    }
  });

  // Payment Term Mutations
  const createTermMutation = useMutation({
    mutationFn: async (data: PaymentTermFormData) => {
      return apiRequest('POST', '/api/payment-terms', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${currentStoreId}/payment-terms`] });
      toast({ title: "Success", description: "Payment term created successfully" });
      setIsTermDialogOpen(false);
      termForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create payment term", variant: "destructive" });
    }
  });

  const updateTermMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PaymentTermFormData> }) => {
      return apiRequest('PUT', `/api/payment-terms/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${currentStoreId}/payment-terms`] });
      toast({ title: "Success", description: "Payment term updated successfully" });
      setIsTermDialogOpen(false);
      setEditingTermId(null);
      termForm.reset();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update payment term", variant: "destructive" });
    }
  });

  const deleteTermMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/payment-terms/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${currentStoreId}/payment-terms`] });
      toast({ title: "Success", description: "Payment term deleted successfully" });
      setSelectedTermId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete payment term", variant: "destructive" });
    }
  });

  // Handlers for Payment Types
  const handleAddType = () => {
    setEditingTypeId(null);
    typeForm.reset();
    setIsTypeDialogOpen(true);
  };

  const handleEditType = () => {
    if (!selectedTypeId || !paymentTypes) return;
    const type = paymentTypes.find((t: any) => t.id === selectedTypeId);
    if (type) {
      setEditingTypeId(type.id);
      typeForm.reset({
        name: type.name,
        description: type.description || "",
        isActive: type.isActive,
        storeId: type.storeId
      });
      setIsTypeDialogOpen(true);
    }
  };

  const handleDeleteType = () => {
    if (!selectedTypeId) return;
    if (confirm("Are you sure you want to delete this payment type?")) {
      deleteTypeMutation.mutate(selectedTypeId);
    }
  };

  const onSubmitType = (data: PaymentTypeFormData) => {
    if (editingTypeId) {
      updateTypeMutation.mutate({ id: editingTypeId, data });
    } else {
      createTypeMutation.mutate(data);
    }
  };

  // Handlers for Payment Terms
  const handleAddTerm = () => {
    setEditingTermId(null);
    termForm.reset();
    setIsTermDialogOpen(true);
  };

  const handleEditTerm = () => {
    if (!selectedTermId || !paymentTerms) return;
    const term = paymentTerms.find((t: any) => t.id === selectedTermId);
    if (term) {
      setEditingTermId(term.id);
      termForm.reset({
        name: term.name,
        days: term.days,
        description: term.description || "",
        isActive: term.isActive,
        storeId: term.storeId
      });
      setIsTermDialogOpen(true);
    }
  };

  const handleDeleteTerm = () => {
    if (!selectedTermId) return;
    if (confirm("Are you sure you want to delete this payment term?")) {
      deleteTermMutation.mutate(selectedTermId);
    }
  };

  const onSubmitTerm = (data: PaymentTermFormData) => {
    if (editingTermId) {
      updateTermMutation.mutate({ id: editingTermId, data });
    } else {
      createTermMutation.mutate(data);
    }
  };

  if (typesLoading || termsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild data-testid="button-back">
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Payment Methods</h1>
          <p className="text-sm text-muted-foreground">Manage payment types and terms</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Payment Types Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Payment Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-md min-h-[300px] max-h-[400px] overflow-y-auto bg-background">
              {paymentTypes && paymentTypes.length > 0 ? (
                <div className="divide-y">
                  {paymentTypes.map((type: any) => (
                    <div
                      key={type.id}
                      onClick={() => setSelectedTypeId(type.id)}
                      className={`px-3 py-2 cursor-pointer transition-colors ${
                        selectedTypeId === type.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      data-testid={`payment-type-${type.id}`}
                    >
                      {type.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                  No payment types found
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddType}
                className="gap-2"
                data-testid="button-add-type"
              >
                <FolderPlus className="h-4 w-4 text-green-600" />
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditType}
                disabled={!selectedTypeId}
                className="gap-2"
                data-testid="button-edit-type"
              >
                <FolderEdit className="h-4 w-4 text-yellow-600" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteType}
                disabled={!selectedTypeId}
                className="gap-2"
                data-testid="button-delete-type"
              >
                <FolderMinus className="h-4 w-4 text-red-600" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Payment Terms Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Payment Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-md min-h-[300px] max-h-[400px] overflow-y-auto bg-background">
              {paymentTerms && paymentTerms.length > 0 ? (
                <div className="divide-y">
                  {paymentTerms.map((term: any) => (
                    <div
                      key={term.id}
                      onClick={() => setSelectedTermId(term.id)}
                      className={`px-3 py-2 cursor-pointer transition-colors ${
                        selectedTermId === term.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      data-testid={`payment-term-${term.id}`}
                    >
                      {term.name}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-sm text-muted-foreground">
                  No payment terms found
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTerm}
                className="gap-2"
                data-testid="button-add-term"
              >
                <FolderPlus className="h-4 w-4 text-green-600" />
                Add
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditTerm}
                disabled={!selectedTermId}
                className="gap-2"
                data-testid="button-edit-term"
              >
                <FolderEdit className="h-4 w-4 text-yellow-600" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeleteTerm}
                disabled={!selectedTermId}
                className="gap-2"
                data-testid="button-delete-term"
              >
                <FolderMinus className="h-4 w-4 text-red-600" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Type Dialog */}
      <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTypeId ? "Edit Payment Type" : "Add Payment Type"}</DialogTitle>
          </DialogHeader>
          <Form {...typeForm}>
            <form onSubmit={typeForm.handleSubmit(onSubmitType)} className="space-y-4">
              <FormField
                control={typeForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Cash, Cheque, Credit Card" {...field} data-testid="input-type-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={typeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional description" {...field} data-testid="input-type-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={typeForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">Enable this payment type</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-type-active" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsTypeDialogOpen(false)} data-testid="button-cancel-type">
                  Cancel
                </Button>
                <Button type="submit" disabled={createTypeMutation.isPending || updateTypeMutation.isPending} data-testid="button-save-type">
                  {editingTypeId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Payment Term Dialog */}
      <Dialog open={isTermDialogOpen} onOpenChange={setIsTermDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTermId ? "Edit Payment Term" : "Add Payment Term"}</DialogTitle>
          </DialogHeader>
          <Form {...termForm}>
            <form onSubmit={termForm.handleSubmit(onSubmitTerm)} className="space-y-4">
              <FormField
                control={termForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 1st Month, Before Delivery, COD" {...field} data-testid="input-term-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={termForm.control}
                name="days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Days *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="e.g., 30, 60, 0 for immediate" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        data-testid="input-term-days"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={termForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional description" {...field} data-testid="input-term-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={termForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel>Active</FormLabel>
                      <p className="text-sm text-muted-foreground">Enable this payment term</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-term-active" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsTermDialogOpen(false)} data-testid="button-cancel-term">
                  Cancel
                </Button>
                <Button type="submit" disabled={createTermMutation.isPending || updateTermMutation.isPending} data-testid="button-save-term">
                  {editingTermId ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
