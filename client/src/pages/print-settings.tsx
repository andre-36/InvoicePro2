import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Save, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { PrintSettings } from "@shared/schema";

// Schema for form validation
const printSettingsFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyTagline: z.string().default(""),
  companyAddress: z.string().default(""),
  companyPhone: z.string().default(""),
  companyEmail: z.string().email("Invalid email").or(z.literal("")),
  logoUrl: z.string().default(""),
  showTax: z.boolean().default(true),
  showDiscount: z.boolean().default(true),
  showPONumber: z.boolean().default(true),
  defaultNotes: z.string().default(""),
  accentColor: z.string().default("#000000"),
  paperSize: z.enum(["a4", "prs"]).default("prs"),
});

type PrintSettingsFormValues = z.infer<typeof printSettingsFormSchema>;

export default function PrintSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const storeId = 1; // Default store ID

  // Fetch print settings
  const { data: printSettings, isLoading } = useQuery<PrintSettings>({
    queryKey: [`/api/stores/${storeId}/print-settings`],
  });

  // Form setup
  const form = useForm<PrintSettingsFormValues>({
    resolver: zodResolver(printSettingsFormSchema),
    values: printSettings ? {
      companyName: printSettings.companyName,
      companyTagline: printSettings.companyTagline ?? "",
      companyAddress: printSettings.companyAddress ?? "",
      companyPhone: printSettings.companyPhone ?? "",
      companyEmail: printSettings.companyEmail ?? "",
      logoUrl: printSettings.logoUrl ?? "",
      showTax: printSettings.showTax,
      showDiscount: printSettings.showDiscount,
      showPONumber: printSettings.showPONumber,
      defaultNotes: printSettings.defaultNotes ?? "",
      accentColor: printSettings.accentColor ?? "#000000",
      paperSize: printSettings.paperSize,
    } : undefined,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: PrintSettingsFormValues) => {
      return apiRequest('PUT', `/api/stores/${storeId}/print-settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${storeId}/print-settings`] });
      toast({
        title: "Settings saved",
        description: "Print settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save print settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PrintSettingsFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="print-settings-page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Print Settings</h1>
          <p className="text-muted-foreground">Configure how your quotations and invoices are printed</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                This information will appear on all printed quotations and invoices
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Your Company Name" data-testid="input-company-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyTagline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tagline / Subtitle</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="DISTRIBUTOR ALUMINUM & ACCESSORIES" data-testid="input-company-tagline" />
                    </FormControl>
                    <FormDescription>
                      A short description of your business
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="Street address, city, postal code" rows={3} data-testid="input-company-address" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="companyPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(XXX) XXXX-XXXX" data-testid="input-company-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="companyEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="your@email.com" data-testid="input-company-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/logo.png" data-testid="input-logo-url" />
                    </FormControl>
                    <FormDescription>
                      URL of your company logo (leave empty to use text placeholder)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Print Appearance */}
          <Card>
            <CardHeader>
              <CardTitle>Print Appearance</CardTitle>
              <CardDescription>
                Customize the look and feel of your printed documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="paperSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Paper Size</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-paper-size">
                            <SelectValue placeholder="Select paper size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="prs">PRS (13.8cm x 21.7cm)</SelectItem>
                          <SelectItem value="a4">A4 (21cm x 29.7cm)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="accentColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accent Color</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input {...field} type="color" className="w-20" data-testid="input-accent-color" />
                          <Input {...field} placeholder="#000000" className="flex-1" />
                        </div>
                      </FormControl>
                      <FormDescription>
                        Color used for borders and accents
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Display Options */}
          <Card>
            <CardHeader>
              <CardTitle>Display Options</CardTitle>
              <CardDescription>
                Choose which fields to show on printed documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="showTax"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Show Tax</FormLabel>
                      <FormDescription>
                        Display tax amounts on printed documents
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-show-tax"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showDiscount"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Show Discount</FormLabel>
                      <FormDescription>
                        Display discount amounts on printed documents
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-show-discount"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="showPONumber"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Show PO Number</FormLabel>
                      <FormDescription>
                        Display purchase order number field on quotations
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-show-po"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Default Content */}
          <Card>
            <CardHeader>
              <CardTitle>Default Content</CardTitle>
              <CardDescription>
                Set default text that appears on all documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="defaultNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field}
                        placeholder="Items checked and verified upon delivery. Items cannot be returned."
                        rows={4}
                        data-testid="input-default-notes"
                      />
                    </FormControl>
                    <FormDescription>
                      These notes will appear at the bottom of all printed documents
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              data-testid="button-save-settings"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
