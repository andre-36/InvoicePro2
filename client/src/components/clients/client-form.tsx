import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertClientSchema, type Client } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Save, X } from "lucide-react";
import { useLocation } from "wouter";

// Extend the schema for validation with proper email preprocessing
const extendedClientSchema = insertClientSchema
  .omit({ storeId: true })
  .extend({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          const trimmed = val.trim();
          return trimmed === '' ? undefined : trimmed;
        }
        return val;
      },
      z.string().email("Please enter a valid email address").optional()
    ),
    phone: z.string().optional(),
    address: z.string().optional(),
    taxNumber: z.string().optional(),
    notes: z.string().optional(),
  });

type ClientFormValues = z.infer<typeof extendedClientSchema>;

interface ClientFormProps {
  clientId?: number;
  onSuccess?: () => void;
}

export function ClientForm({ clientId, onSuccess }: ClientFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  // If editing, fetch client data
  const { data: clientData, isLoading } = useQuery<Client>({
    queryKey: [`/api/clients/${clientId}`],
    enabled: !!clientId,
  });

  // Form setup
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(extendedClientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      taxNumber: "",
      notes: "",
    }
  });

  // Update form when client data is loaded
  useEffect(() => {
    if (clientId && clientData && !form.formState.isDirty) {
      form.reset({
        ...clientData,
        email: clientData.email ?? "",
        phone: clientData.phone ?? "",
        address: clientData.address ?? "",
        taxNumber: clientData.taxNumber ?? "",
        notes: clientData.notes ?? "",
      });
    }
  }, [clientId, clientData, form]);

  // Create/update client mutation
  const mutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      if (clientId) {
        return apiRequest('PUT', `/api/clients/${clientId}`, values);
      } else {
        // Add storeId when creating new client
        const clientData = { ...values, storeId: 1 };
        return apiRequest('POST', '/api/clients', clientData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      toast({
        title: clientId ? "Client updated" : "Client created",
        description: clientId ? "The client has been updated successfully." : "The client has been created successfully.",
      });
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate("/clients");
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${clientId ? "update" : "create"} client: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  function onSubmit(values: ClientFormValues) {
    mutation.mutate(values);
  }

  if (clientId && isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>{clientId ? "Edit Client" : "Add New Client"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Display client number for existing clients */}
            {clientId && clientData?.clientNumber && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                <div className="text-sm font-medium text-gray-700">Client Number</div>
                <div className="text-lg font-mono text-gray-900" data-testid="text-client-number">
                  {clientData.clientNumber}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter client name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter email address" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="taxNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax/VAT Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter tax/VAT number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter full address" 
                      className="resize-none" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter any additional notes" 
                      className="resize-none" 
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (onSuccess) {
                  onSuccess();
                } else {
                  navigate("/clients");
                }
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {clientId ? "Update Client" : "Save Client"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
