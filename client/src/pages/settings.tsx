import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, User, Building, CreditCard, Upload, Save, Check, Database, Download, FolderPlus, FolderEdit, FolderMinus, FolderOpen, Plus, Edit, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { UploadResult } from "@uppy/core";

// Profile settings schema
const profileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  companyName: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

// Company settings schema
const companySchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  companyTagline: z.string().optional(),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
  taxNumber: z.string().optional(),
  logoUrl: z.string().optional(),
});

// Payment settings schema
const paymentSchema = z.object({
  accountName: z.string().min(2, "Account name is required"),
  accountNumber: z.string().min(2, "Account number is required"),
  bank: z.string().min(2, "Bank name is required"),
  routingNumber: z.string().optional(),
  swiftCode: z.string().optional(),
  paypalEmail: z.string().email("Please enter a valid email").optional().or(z.literal("")),
});

// Security settings schema
const securitySchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Payment type schema
const paymentTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  storeId: z.number().default(1)
});

// Payment term schema
const paymentTermSchema = z.object({
  name: z.string().min(1, "Name is required"),
  days: z.number().min(0, "Days must be 0 or greater"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  storeId: z.number().default(1)
});

// Category schema
const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;
type Category = { id: number; name: string; description: string | null };

type ProfileFormValues = z.infer<typeof profileSchema>;
type CompanyFormValues = z.infer<typeof companySchema>;
type PaymentFormValues = z.infer<typeof paymentSchema>;
type SecurityFormValues = z.infer<typeof securitySchema>;
type PaymentTypeFormData = z.infer<typeof paymentTypeSchema>;
type PaymentTermFormData = z.infer<typeof paymentTermSchema>;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const [isTermDialogOpen, setIsTermDialogOpen] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<number | null>(null);
  const [editingTermId, setEditingTermId] = useState<number | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState<number | null>(null);
  const [selectedTermId, setSelectedTermId] = useState<number | null>(null);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const hasInitialized = useRef(false);

  // Fetch user data
  const { data: userData, isLoading } = useQuery({
    queryKey: ['/api/user'],
  });

  // Fetch payment types and terms
  const { data: paymentTypes } = useQuery({
    queryKey: ['/api/stores/1/payment-types'],
  });

  const { data: paymentTerms } = useQuery({
    queryKey: ['/api/stores/1/payment-terms'],
  });

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  // Profile form setup
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      username: "",
      companyName: "",
      address: "",
      phone: "",
    }
  });

  // Company form setup
  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: "",
      companyTagline: "",
      companyAddress: "",
      companyPhone: "",
      companyEmail: "",
      taxNumber: "",
      logoUrl: "",
    }
  });

  // Payment form setup
  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      accountName: "",
      accountNumber: "",
      bank: "",
      routingNumber: "",
      swiftCode: "",
      paypalEmail: "",
    }
  });

  // Security form setup
  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  });

  // Payment type form setup
  const typeForm = useForm<PaymentTypeFormData>({
    resolver: zodResolver(paymentTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
      storeId: 1
    }
  });

  // Payment term form setup
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

  // Category form setup
  const categoryForm = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
    }
  });

  // Update user profile mutation
  const profileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileFormValues>) => {
      return apiRequest('PUT', '/api/user', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update profile: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update company details mutation
  const companyMutation = useMutation({
    mutationFn: async (data: CompanyFormValues) => {
      return apiRequest('PUT', '/api/user/company', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Company details updated",
        description: "Your company details have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update company details: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update payment settings mutation
  const paymentMutation = useMutation({
    mutationFn: async (data: PaymentFormValues) => {
      return apiRequest('PUT', '/api/user/payment', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Payment settings updated",
        description: "Your payment settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update payment settings: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Update password mutation
  const passwordMutation = useMutation({
    mutationFn: async (data: SecurityFormValues) => {
      return apiRequest('PUT', '/api/user/password', data);
    },
    onSuccess: () => {
      securityForm.reset();
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update password: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Payment Type Mutations
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
      setSelectedTermId(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete payment term", variant: "destructive" });
    }
  });

  // Category mutations
  const categoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: number, data: CategoryFormData }) => {
      if (id) {
        return apiRequest('PUT', `/api/categories/${id}`, data);
      } else {
        return apiRequest('POST', '/api/categories', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setIsCategoryDialogOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
      toast({
        title: editingCategory ? "Category updated" : "Category created",
        description: editingCategory 
          ? "The category has been updated successfully." 
          : "The category has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });
      setDeletingCategory(null);
      toast({
        title: "Category deleted",
        description: "The category has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset hasInitialized when component unmounts (so it reinitializes when user navigates back)
  useEffect(() => {
    return () => {
      hasInitialized.current = false;
    };
  }, []);

  // Set form values when user data is loaded (only once per mount)
  useEffect(() => {
    if (userData && !hasInitialized.current) {
      profileForm.reset({
        fullName: userData.fullName || "",
        email: userData.email || "",
        username: userData.username || "",
        companyName: userData.companyName || "",
        address: userData.address || "",
        phone: userData.phone || "",
      });

      companyForm.reset({
        companyName: userData.companyName || "",
        companyTagline: userData.companyTagline || "",
        companyAddress: userData.companyAddress || "",
        companyPhone: userData.companyPhone || "",
        companyEmail: userData.companyEmail || "",
        taxNumber: userData.taxNumber || "",
        logoUrl: userData.logoUrl || "",
      });

      hasInitialized.current = true;
    }
  }, [userData, profileForm, companyForm]);

  // Form submission handlers
  const onProfileSubmit = (data: ProfileFormValues) => {
    profileMutation.mutate(data);
  };

  const onCompanySubmit = (data: CompanyFormValues) => {
    companyMutation.mutate(data);
  };

  const onPaymentSubmit = (data: PaymentFormValues) => {
    paymentMutation.mutate(data);
  };

  const onSecuritySubmit = (data: SecurityFormValues) => {
    passwordMutation.mutate(data);
  };

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

  // Category handlers
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      description: category.description || "",
    });
    setIsCategoryDialogOpen(true);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    categoryForm.reset({
      name: "",
      description: "",
    });
    setIsCategoryDialogOpen(true);
  };

  const handleSubmitCategory = (data: CategoryFormData) => {
    categoryMutation.mutate({
      id: editingCategory?.id,
      data,
    });
  };

  const handleDeleteCategory = () => {
    if (deletingCategory) {
      deleteCategoryMutation.mutate(deletingCategory.id);
    }
  };

  // Export backup mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/backup/export?storeId=1', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to export backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      return true;
    },
    onSuccess: () => {
      toast({
        title: "Backup exported",
        description: "Your database backup has been downloaded successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Export failed",
        description: `Failed to export backup: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Import backup mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const backupData = JSON.parse(text);

      return apiRequest('POST', '/api/backup/import', {
        data: backupData.data,
        storeId: 1
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Import successful",
        description: data.message,
      });
      setImportFile(null);
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: `Failed to import backup: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'application/json') {
      setImportFile(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select a valid JSON backup file.",
        variant: "destructive",
      });
    }
  };

  const handleImport = () => {
    if (importFile) {
      importMutation.mutate(importFile);
    }
  };

  // Get user initials for avatar
  const getUserInitials = (name: string = "") => {
    return name
      .split(" ")
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  };

  // Show loading spinner if user data is loading
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account settings and preferences</p>
      </div>

      <Tabs 
        defaultValue="profile" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <div className="border-b">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <Building className="h-4 w-4" />
              <span>Company</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Payment Methods</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Settings className="h-4 w-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="backup" className="gap-2">
              <Database className="h-4 w-4" />
              <span>Backup</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              <span>Categories</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information and how others see you on the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-lg bg-primary text-white">
                    {getUserInitials(userData?.fullName)}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <Button variant="outline" className="gap-2">
                    <Upload className="h-4 w-4" />
                    <span>Upload Image</span>
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    JPG, GIF or PNG. Max file size 1MB.
                  </p>
                </div>
              </div>

              <Separator />

              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={profileForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your email" type="email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={profileForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter your address" 
                            rows={3}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={profileMutation.isPending || !profileForm.formState.isDirty}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Changes</span>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="company" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Update your company details which will appear on your invoices and quotations</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...companyForm}>
                <form onSubmit={companyForm.handleSubmit(onCompanySubmit)} className="space-y-6">
                  <FormField
                    control={companyForm.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Company Name" {...field} data-testid="input-company-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="companyTagline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tagline / Subtitle</FormLabel>
                        <FormControl>
                          <Input placeholder="DISTRIBUTOR ALUMINUM & ACCESSORIES" {...field} data-testid="input-company-tagline" />
                        </FormControl>
                        <FormDescription>
                          A short description of your business
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Logo</FormLabel>
                        <div className="space-y-4">
                          {field.value && (
                            <div className="flex items-center gap-4 p-4 border rounded-lg">
                              <img 
                                src={field.value} 
                                alt="Company Logo" 
                                className="h-20 w-20 object-contain border rounded"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">Current Logo</p>
                                <p className="text-xs text-muted-foreground break-all">{field.value}</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => field.onChange("")}
                              >
                                Remove
                              </Button>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <FormControl>
                              <Input 
                                {...field} 
                                placeholder="Or enter logo URL manually" 
                                data-testid="input-logo-url" 
                              />
                            </FormControl>
                            <ObjectUploader
                              maxNumberOfFiles={1}
                              maxFileSize={5242880}
                              onGetUploadParameters={async (file) => {
                                console.log("Getting upload parameters for file:", file?.name);
                                const responseObj = await apiRequest('POST', '/api/objects/upload', {});
                                const response = await responseObj.json();
                                console.log("Upload parameters response:", response);
                                if (!response.uploadURL) {
                                  throw new Error("No upload URL received from server");
                                }
                                return {
                                  method: 'PUT' as const,
                                  url: response.uploadURL,
                                };
                              }}
                              onComplete={async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
                                console.log("Upload complete, result:", result);
                                
                                // Check for failed uploads first
                                if (result.failed && result.failed.length > 0) {
                                  const failedFile = result.failed[0];
                                  console.error("Upload failed:", failedFile);
                                  toast({
                                    title: "Upload gagal",
                                    description: `Gagal upload file: ${failedFile.error || 'Error tidak diketahui'}`,
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                if (result.successful.length > 0) {
                                  const uploadedFile = result.successful[0];
                                  const uploadURL = uploadedFile.uploadURL;

                                  console.log("File berhasil diupload ke:", uploadURL);

                                  try {
                                    const responseObj = await apiRequest('PUT', '/api/logo', { logoURL: uploadURL });
                                    const responseData = await responseObj.json();

                                    console.log("Logo API response:", responseData);

                                    // Update the form field with the uploaded URL
                                    const logoUrl = responseData.logoPath || responseData.logoURL || uploadURL;
                                    field.onChange(logoUrl);

                                    // Mark form as dirty so save button is enabled
                                    companyForm.setValue('logoUrl', logoUrl, { 
                                      shouldDirty: true,
                                      shouldTouch: true,
                                      shouldValidate: true
                                    });

                                    toast({
                                      title: "Logo berhasil diupload",
                                      description: "Logo perusahaan Anda berhasil diupload. Klik 'Save Company Details' untuk menyimpan perubahan.",
                                    });
                                  } catch (error: any) {
                                    console.error("Logo API error:", error);
                                    toast({
                                      title: "Error",
                                      description: error.message || "Gagal menyimpan logo. Silakan coba lagi.",
                                      variant: "destructive",
                                    });
                                  }
                                } else {
                                  console.warn("No successful uploads");
                                  toast({
                                    title: "Tidak ada file yang diupload",
                                    description: "Silakan pilih file untuk diupload.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Logo
                            </ObjectUploader>
                          </div>
                        </div>
                        <FormDescription>
                          Upload an image or enter a URL (max 5MB, images only)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <FormField
                    control={companyForm.control}
                    name="companyAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Street address, city, postal code" rows={3} {...field} data-testid="input-company-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={companyForm.control}
                      name="companyPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(XXX) XXXX-XXXX" {...field} data-testid="input-company-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={companyForm.control}
                      name="companyEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="company@email.com" {...field} data-testid="input-company-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={companyForm.control}
                      name="taxNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax Number / VAT ID</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter tax number" {...field} data-testid="input-tax-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={companyMutation.isPending || !companyForm.formState.isDirty}
                      className="gap-2"
                    >
                      <Save className="h-4 w-4" />
                      <span>Save Company Details</span>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Payment Types Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Payment Types</CardTitle>
                <CardDescription>Manage payment methods (e.g., Cash, Bank Transfer, Credit Card)</CardDescription>
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
                <CardDescription>Define payment terms for invoices (e.g., Net 30, COD)</CardDescription>
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
                  >
                    <FolderMinus className="h-4 w-4 text-red-600" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your password and account security</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
                  <h3 className="text-lg font-medium mb-4">Change Password</h3>

                  <FormField
                    control={securityForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter current password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={securityForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={securityForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={passwordMutation.isPending || !securityForm.formState.isDirty}
                      className="gap-2"
                    >
                      <Check className="h-4 w-4" />
                      <span>Update Password</span>
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                Database Backup
              </CardTitle>
              <CardDescription>
                Export and import your data for backup and migration purposes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Data
                </Label>
                <p className="text-sm text-gray-600">
                  Download a complete backup of your invoices, clients, products, and other data as a JSON file.
                </p>
                <Button 
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                  variant="outline"
                  className="w-full sm:w-auto"
                  data-testid="button-export-backup"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {exportMutation.isPending ? "Exporting..." : "Export Backup"}
                </Button>
              </div>

              <Separator />

              {/* Import Section */}
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import Data
                </Label>
                <p className="text-sm text-gray-600">
                  Import data from a previously exported backup file. This will add the data to your existing records.
                </p>
                <div className="space-y-3">
                  <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Input
                      type="file"
                      accept=".json"
                      onChange={handleFileChange}
                      data-testid="input-backup-file"
                    />
                  </div>
                  {importFile && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>Selected: {importFile.name}</span>
                    </div>
                  )}
                  <Button 
                    onClick={handleImport}
                    disabled={!importFile || importMutation.isPending}
                    variant="outline"
                    className="w-full sm:w-auto"
                    data-testid="button-import-backup"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {importMutation.isPending ? "Importing..." : "Import Backup"}
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Security Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Backup Guidelines</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Regular backups help protect against data loss</li>
                  <li>• Store backup files in a secure location</li>
                  <li>• Test backup restoration periodically</li>
                  <li>• Backup files contain sensitive business data</li>
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-900 mb-2">Import Warning</h4>
                <p className="text-sm text-amber-800">
                  Importing data will add records to your existing database. Make sure to create a backup before importing if you want to preserve your current state.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Product Categories</CardTitle>
                <CardDescription>Manage product categories for better organization</CardDescription>
              </div>
              <Button 
                onClick={handleAddCategory}
                data-testid="button-add-category"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </CardHeader>
            <CardContent>
              {categoriesLoading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : !categories || categories.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No categories</h3>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Get started by creating a new category.
                  </p>
                  <div className="mt-6">
                    <Button onClick={handleAddCategory}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Category
                    </Button>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((category) => (
                      <TableRow key={category.id} data-testid={`row-category-${category.id}`}>
                        <TableCell className="font-medium" data-testid={`text-category-name-${category.id}`}>
                          {category.name}
                        </TableCell>
                        <TableCell className="text-gray-500 dark:text-gray-400" data-testid={`text-category-description-${category.id}`}>
                          {category.description || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditCategory(category)}
                              data-testid={`button-edit-category-${category.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingCategory(category)}
                              data-testid={`button-delete-category-${category.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Category Add/Edit Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <Form {...categoryForm}>
            <form onSubmit={categoryForm.handleSubmit(handleSubmitCategory)} className="space-y-4">
              <FormField
                control={categoryForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g., Aluminum Profiles" 
                        {...field} 
                        data-testid="input-category-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={categoryForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter category description..." 
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-category-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCategoryDialogOpen(false)}
                  data-testid="button-cancel-category"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={categoryMutation.isPending}
                  data-testid="button-submit-category"
                >
                  {categoryMutation.isPending ? "Saving..." : (editingCategory ? "Update" : "Create")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Category Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the category "{deletingCategory?.name}". 
              Products in this category will not be deleted but will have no category assigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-category">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteCategoryMutation.isPending}
              data-testid="button-confirm-delete-category"
            >
              {deleteCategoryMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                      <Input placeholder="e.g., Cash, Cheque, Credit Card" {...field} />
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
                      <Textarea placeholder="Optional description" {...field} />
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
                <Button type="button" variant="outline" onClick={() => setIsTypeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTypeMutation.isPending || updateTypeMutation.isPending}>
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
                      <Input placeholder="e.g., 1st Month, Before Delivery, COD" {...field} />
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
                      <Textarea placeholder="Optional description" {...field} />
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
                <Button type="button" variant="outline" onClick={() => setIsTermDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createTermMutation.isPending || updateTermMutation.isPending}>
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