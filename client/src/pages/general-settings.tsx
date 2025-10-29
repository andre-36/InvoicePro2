import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Settings, Save, Upload, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { PrintSettings } from "@shared/schema";

// Schema for form validation
const generalSettingsFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyAddress: z.string().default(""),
  companyPhone: z.string().default(""),
  logoUrl: z.string().default(""),
  defaultNotes: z.string().default(""),
});

type GeneralSettingsFormValues = z.infer<typeof generalSettingsFormSchema>;

export default function GeneralSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const storeId = 1; // Default store ID
  const [logoPreview, setLogoPreview] = useState<string>("");

  // Fetch print settings (which contains all our settings)
  const { data: settings, isLoading } = useQuery<PrintSettings>({
    queryKey: [`/api/stores/${storeId}/print-settings`],
  });

  // Form setup
  const form = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsFormSchema),
    values: settings ? {
      companyName: settings.companyName,
      companyAddress: settings.companyAddress ?? "",
      companyPhone: settings.companyPhone ?? "",
      logoUrl: settings.logoUrl ?? "",
      defaultNotes: settings.defaultNotes ?? "",
    } : undefined,
  });

  // Update logo preview when settings load
  useEffect(() => {
    if (settings?.logoUrl) {
      setLogoPreview(settings.logoUrl);
    }
  }, [settings?.logoUrl]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: GeneralSettingsFormValues) => {
      // We're updating print settings but only the fields shown in general settings
      return apiRequest('PUT', `/api/stores/${storeId}/print-settings`, {
        ...settings, // Keep existing settings
        ...data, // Override with new values
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${storeId}/print-settings`] });
      toast({
        title: "Settings saved",
        description: "General settings have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GeneralSettingsFormValues) => {
    updateMutation.mutate(data);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create a preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
        form.setValue("logoUrl", result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview("");
    form.setValue("logoUrl", "");
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
    <div className="space-y-6" data-testid="general-settings-page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">General Settings</h1>
          <p className="text-muted-foreground">Manage your company information and print settings</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                Basic information about your company
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Company Logo */}
              <FormField
                control={form.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Logo</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {logoPreview ? (
                          <div className="relative inline-block">
                            <img 
                              src={logoPreview} 
                              alt="Company Logo Preview" 
                              className="h-32 w-auto rounded-lg border border-gray-200 object-contain bg-white p-2"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                              onClick={handleRemoveLogo}
                              data-testid="button-remove-logo"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-32 w-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                            <div className="text-center">
                              <Upload className="mx-auto h-8 w-8 text-gray-400" />
                              <p className="mt-1 text-xs text-gray-500">No logo</p>
                            </div>
                          </div>
                        )}
                        <div>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="cursor-pointer"
                            data-testid="input-logo-upload"
                          />
                          <FormDescription>
                            Upload your company logo (recommended size: 200x200px)
                          </FormDescription>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              {/* Company Name */}
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

              {/* Company Address */}
              <FormField
                control={form.control}
                name="companyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="123 Business Street, City, State, ZIP"
                        rows={3}
                        data-testid="input-company-address"
                      />
                    </FormControl>
                    <FormDescription>
                      Your company's physical address
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company Phone */}
              <FormField
                control={form.control}
                name="companyPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+1 (555) 123-4567" data-testid="input-company-phone" />
                    </FormControl>
                    <FormDescription>
                      Your company's contact phone number
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Print Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Print Settings</CardTitle>
              <CardDescription>
                Configure default settings for printed documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Default Notes */}
              <FormField
                control={form.control}
                name="defaultNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter default notes or terms that will appear on invoices and quotations"
                        rows={4}
                        data-testid="input-default-notes"
                      />
                    </FormControl>
                    <FormDescription>
                      These notes will appear by default on all printed quotations and invoices
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
              disabled={updateMutation.isPending}
              data-testid="button-save-settings"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
