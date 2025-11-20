
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, ArrowLeft } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isTermDialogOpen, setIsTermDialogOpen] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [editingTermId, setEditingTermId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const typeForm = useForm<PaymentTypeFormData>({
    resolver: zodResolver(paymentTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
      storeId: 1
    }
  });

  const termForm = useForm<PaymentTermFormData>({
    resolver: zodResolver(paymentTermSchema),
    defaultValues: {
      name: "",
      days: 0,
      description: "",
      isActive: true,
      storeId: 1
    }
  });

  // Payment Types queries
  const { data: paymentTypes, isLoading: typesLoading } = useQuery({
    queryKey: ['/api/stores/1/payment-types'],
  });

  const createTypeMutation = useMutation({
    mutationFn: async (data: PaymentTypeFormData) => {
      return apiRequest('POST', '/api/payment-types', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores/1/payment-types'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/stores/1/payment-types'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/stores/1/payment-types'] });
      toast({ title: "Success", description: "Payment type deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete payment type", variant: "destructive" });
    }
  });

  // Payment Terms queries
  const { data: paymentTerms, isLoading: termsLoading } = useQuery({
    queryKey: ['/api/stores/1/payment-terms'],
  });

  const createTermMutation = useMutation({
    mutationFn: async (data: PaymentTermFormData) => {
      return apiRequest('POST', '/api/payment-terms', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores/1/payment-terms'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/stores/1/payment-terms'] });
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
      queryClient.invalidateQueries({ queryKey: ['/api/stores/1/payment-terms'] });
      toast({ title: "Success", description: "Payment term deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete payment term", variant: "destructive" });
    }
  });

  const handleEditType = (paymentType: any) => {
    setEditingTypeId(paymentType.id);
    typeForm.reset({
      name: paymentType.name,
      description: paymentType.description || "",
      isActive: paymentType.isActive,
      storeId: paymentType.storeId
    });
    setIsTypeDialogOpen(true);
  };

  const handleDeleteType = (id: number) => {
    if (confirm("Are you sure you want to delete this payment type?")) {
      deleteTypeMutation.mutate(id);
    }
  };

  const handleEditTerm = (paymentTerm: any) => {
    setEditingTermId(paymentTerm.id);
    termForm.reset({
      name: paymentTerm.name,
      days: paymentTerm.days,
      description: paymentTerm.description || "",
      isActive: paymentTerm.isActive,
      storeId: paymentTerm.storeId
    });
    setIsTermDialogOpen(true);
  };

  const handleDeleteTerm = (id: number) => {
    if (confirm("Are you sure you want to delete this payment term?")) {
      deleteTermMutation.mutate(id);
    }
  };

  const onTypeSubmit = (data: PaymentTypeFormData) => {
    if (editingTypeId) {
      updateTypeMutation.mutate({ id: editingTypeId, data });
    } else {
      createTypeMutation.mutate(data);
    }
  };

  const onTermSubmit = (data: PaymentTermFormData) => {
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
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Payment Methods</h1>
          <p className="text-sm text-muted-foreground">Manage payment types and terms for your business</p>
        </div>
      </div>

      <Tabs defaultValue="types" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="types">Payment Types</TabsTrigger>
          <TabsTrigger value="terms">Payment Terms</TabsTrigger>
        </TabsList>

        <TabsContent value="types" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isTypeDialogOpen} onOpenChange={(open) => {
              setIsTypeDialogOpen(open);
              if (!open) {
                setEditingTypeId(null);
                typeForm.reset();
              }
            }}>
              <Button onClick={() => setIsTypeDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Type
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTypeId ? "Edit Payment Type" : "Add Payment Type"}</DialogTitle>
                </DialogHeader>
                <Form {...typeForm}>
                  <form onSubmit={typeForm.handleSubmit(onTypeSubmit)} className="space-y-4">
                    <FormField
                      control={typeForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Cash, Credit Card" />
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
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Add description..." />
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
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => {
                        setIsTypeDialogOpen(false);
                        setEditingTypeId(null);
                        typeForm.reset();
                      }}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingTypeId ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Types List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentTypes && paymentTypes.length > 0 ? (
                    paymentTypes.map((type: any) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.name}</TableCell>
                        <TableCell>{type.description || "-"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            type.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            {type.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditType(type)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteType(type.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No payment types found. Add one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="terms" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isTermDialogOpen} onOpenChange={(open) => {
              setIsTermDialogOpen(open);
              if (!open) {
                setEditingTermId(null);
                termForm.reset();
              }
            }}>
              <Button onClick={() => setIsTermDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Payment Term
              </Button>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingTermId ? "Edit Payment Term" : "Add Payment Term"}</DialogTitle>
                </DialogHeader>
                <Form {...termForm}>
                  <form onSubmit={termForm.handleSubmit(onTermSubmit)} className="space-y-4">
                    <FormField
                      control={termForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Net 30, COD" />
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
                          <FormLabel>Days</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              placeholder="Number of days"
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
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Add description..." />
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
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => {
                        setIsTermDialogOpen(false);
                        setEditingTermId(null);
                        termForm.reset();
                      }}>
                        Cancel
                      </Button>
                      <Button type="submit">
                        {editingTermId ? "Update" : "Create"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Payment Terms List</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentTerms && paymentTerms.length > 0 ? (
                    paymentTerms.map((term: any) => (
                      <TableRow key={term.id}>
                        <TableCell className="font-medium">{term.name}</TableCell>
                        <TableCell>{term.days} days</TableCell>
                        <TableCell>{term.description || "-"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            term.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}>
                            {term.isActive ? "Active" : "Inactive"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditTerm(term)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTerm(term.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No payment terms found. Add one to get started.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
