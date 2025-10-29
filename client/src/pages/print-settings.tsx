import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Save, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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

// Schema for print preferences only
const printSettingsFormSchema = z.object({
  paperSize: z.enum(["prs", "a4"]),
  showTax: z.boolean(),
  showDiscount: z.boolean(),
  showPONumber: z.boolean(),
  defaultNotes: z.string(),
  accentColor: z.string(),
});

type PrintSettingsFormValues = z.infer<typeof printSettingsFormSchema>;

export default function PrintSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [storeId] = useState(1);

  const { data: printSettings, isLoading } = useQuery<PrintSettings>({
    queryKey: ["/api/stores", storeId, "print-settings"],
  });

  const form = useForm<PrintSettingsFormValues>({
    resolver: zodResolver(printSettingsFormSchema),
    defaultValues: {
      paperSize: "prs",
      showTax: true,
      showDiscount: true,
      showPONumber: true,
      defaultNotes: "Items checked and verified upon delivery. Items cannot be returned.",
      accentColor: "#000000",
    },
  });

  if (printSettings && !form.formState.isDirty) {
    form.reset({
      paperSize: printSettings.paperSize || "prs",
      showTax: printSettings.showTax ?? true,
      showDiscount: printSettings.showDiscount ?? true,
      showPONumber: printSettings.showPONumber ?? true,
      defaultNotes: printSettings.defaultNotes || "Items checked and verified upon delivery. Items cannot be returned.",
      accentColor: printSettings.accentColor || "#000000",
    });
  }

  const updateMutation = useMutation({
    mutationFn: async (data: PrintSettingsFormValues) => {
      return apiRequest("PUT", `/api/stores/${storeId}/print-settings`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stores", storeId, "print-settings"] });
      toast({
        title: "Settings saved",
        description: "Your print settings have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save print settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PrintSettingsFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6" data-testid="print-settings-page">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
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
          <p className="text-muted-foreground">Configure print preferences for quotations and invoices</p>
          <p className="text-sm text-muted-foreground mt-1">
            To update company information and logo, visit <a href="/settings" className="text-primary hover:underline">General Settings → Company</a>
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Print Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Print Preferences</CardTitle>
              <CardDescription>
                Customize paper size and formatting options
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
                      <div className="flex gap-2">
                        <FormControl>
                          <input
                            type="color"
                            {...field}
                            className="h-10 w-20 rounded border border-input"
                            data-testid="input-accent-color"
                          />
                        </FormControl>
                        <FormControl>
                          <input
                            type="text"
                            {...field}
                            className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                            placeholder="#000000"
                            data-testid="input-accent-color-text"
                          />
                        </FormControl>
                      </div>
                      <FormDescription>Color used for headers and accents</FormDescription>
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
                Choose which information to show on printed documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="showTax"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Show Tax</FormLabel>
                      <FormDescription>
                        Display tax information on documents
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
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Show Discount</FormLabel>
                      <FormDescription>
                        Display discount fields on documents
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
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Show PO Number</FormLabel>
                      <FormDescription>
                        Display purchase order number field
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-show-po-number"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Default Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Default Notes</CardTitle>
              <CardDescription>
                Standard terms and conditions to appear on documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="defaultNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Items checked and verified upon delivery. Items cannot be returned."
                        data-testid="textarea-default-notes"
                      />
                    </FormControl>
                    <FormDescription>
                      These notes will appear at the bottom of invoices and quotations
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending || !form.formState.isDirty}
              className="gap-2"
              data-testid="button-save-settings"
            >
              <Save className="h-4 w-4" />
              <span>{updateMutation.isPending ? "Saving..." : "Save Settings"}</span>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
