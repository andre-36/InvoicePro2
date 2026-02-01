import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Trash2, Users, Shield, Store, Eye, EyeOff } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const userFormSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter").optional().or(z.literal("")),
  fullName: z.string().min(1, "Nama lengkap wajib diisi"),
  email: z.string().email("Email tidak valid"),
  role: z.enum(["owner", "staff"]),
  storeId: z.number().nullable(),
  permissions: z.array(z.string()),
  isActive: z.boolean(),
});

type UserFormData = z.infer<typeof userFormSchema>;

type StaffUser = {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: 'owner' | 'staff';
  storeId: number | null;
  permissions: string[];
  isActive: boolean;
};

type StoreOption = {
  id: number;
  name: string;
};

const PERMISSION_GROUPS = {
  "Dashboard": [
    { id: "dashboard.view", label: "Lihat Dashboard" },
  ],
  "Produk": [
    { id: "products.view", label: "Lihat Produk" },
    { id: "products.create", label: "Tambah Produk" },
    { id: "products.edit", label: "Edit Produk" },
    { id: "products.delete", label: "Hapus Produk" },
    { id: "products.adjust_stock", label: "Adjust Stock" },
  ],
  "Invoice": [
    { id: "invoices.view", label: "Lihat Invoice" },
    { id: "invoices.create", label: "Buat Invoice" },
    { id: "invoices.edit", label: "Edit Invoice" },
    { id: "invoices.delete", label: "Hapus Invoice" },
    { id: "invoices.print", label: "Print Invoice" },
  ],
  "Quotation": [
    { id: "quotations.view", label: "Lihat Quotation" },
    { id: "quotations.create", label: "Buat Quotation" },
    { id: "quotations.edit", label: "Edit Quotation" },
    { id: "quotations.delete", label: "Hapus Quotation" },
    { id: "quotations.print", label: "Print Quotation" },
  ],
  "Purchase Order": [
    { id: "purchase_orders.view", label: "Lihat PO" },
    { id: "purchase_orders.create", label: "Buat PO" },
    { id: "purchase_orders.edit", label: "Edit PO" },
    { id: "purchase_orders.delete", label: "Hapus PO" },
  ],
  "Goods Receipt": [
    { id: "goods_receipts.view", label: "Lihat Penerimaan Barang" },
    { id: "goods_receipts.create", label: "Buat Penerimaan Barang" },
    { id: "goods_receipts.delete", label: "Hapus Penerimaan Barang" },
  ],
  "Delivery Note": [
    { id: "delivery_notes.view", label: "Lihat Surat Jalan" },
    { id: "delivery_notes.create", label: "Buat Surat Jalan" },
    { id: "delivery_notes.edit", label: "Edit Surat Jalan" },
    { id: "delivery_notes.delete", label: "Hapus Surat Jalan" },
  ],
  "Retur": [
    { id: "returns.view", label: "Lihat Retur" },
    { id: "returns.create", label: "Buat Retur" },
    { id: "returns.delete", label: "Hapus Retur" },
  ],
  "Klien": [
    { id: "clients.view", label: "Lihat Klien" },
    { id: "clients.create", label: "Tambah Klien" },
    { id: "clients.edit", label: "Edit Klien" },
    { id: "clients.delete", label: "Hapus Klien" },
  ],
  "Supplier": [
    { id: "suppliers.view", label: "Lihat Supplier" },
    { id: "suppliers.create", label: "Tambah Supplier" },
    { id: "suppliers.edit", label: "Edit Supplier" },
    { id: "suppliers.delete", label: "Hapus Supplier" },
  ],
  "Transaksi": [
    { id: "transactions.view", label: "Lihat Transaksi" },
    { id: "transactions.create", label: "Buat Transaksi" },
    { id: "transactions.edit", label: "Edit Transaksi" },
    { id: "transactions.delete", label: "Hapus Transaksi" },
  ],
  "Laporan": [
    { id: "reports.view", label: "Lihat Laporan" },
    { id: "reports.export", label: "Export Laporan" },
  ],
  "Pengaturan": [
    { id: "settings.view", label: "Lihat Pengaturan" },
    { id: "settings.edit", label: "Edit Pengaturan" },
    { id: "settings.users", label: "Kelola User" },
  ],
};

export function UserManagement() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<StaffUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery<StaffUser[]>({
    queryKey: ['/api/users'],
  });

  const { data: stores } = useQuery<StoreOption[]>({
    queryKey: ['/api/stores'],
  });

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "staff",
      storeId: null,
      permissions: [],
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      return apiRequest('POST', '/api/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "Berhasil", description: "User berhasil ditambahkan" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<UserFormData> }) => {
      return apiRequest('PUT', `/api/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "Berhasil", description: "User berhasil diupdate" });
      setIsDialogOpen(false);
      setEditingUser(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({ title: "Berhasil", description: "User berhasil dihapus" });
      setDeletingUser(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleAdd = () => {
    setEditingUser(null);
    form.reset({
      username: "",
      password: "",
      fullName: "",
      email: "",
      role: "staff",
      storeId: stores?.[0]?.id || null,
      permissions: [],
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const handleEdit = (user: StaffUser) => {
    setEditingUser(user);
    form.reset({
      username: user.username,
      password: "",
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      storeId: user.storeId,
      permissions: user.permissions || [],
      isActive: user.isActive,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: UserFormData) => {
    if (editingUser) {
      const updateData: Partial<UserFormData> = { ...data };
      if (!updateData.password) {
        delete updateData.password;
      }
      updateMutation.mutate({ id: editingUser.id, data: updateData });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleSelectAllPermissions = (groupName: string, checked: boolean) => {
    const group = PERMISSION_GROUPS[groupName as keyof typeof PERMISSION_GROUPS];
    const currentPermissions = form.getValues("permissions");
    
    if (checked) {
      const combined = [...currentPermissions, ...group.map(p => p.id)];
      const newPermissions = combined.filter((item, index) => combined.indexOf(item) === index);
      form.setValue("permissions", newPermissions);
    } else {
      const groupIds = group.map(p => p.id);
      form.setValue("permissions", currentPermissions.filter(p => !groupIds.includes(p)));
    }
  };

  const isGroupFullySelected = (groupName: string) => {
    const group = PERMISSION_GROUPS[groupName as keyof typeof PERMISSION_GROUPS];
    const currentPermissions = form.watch("permissions");
    return group.every(p => currentPermissions.includes(p.id));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manajemen User
          </CardTitle>
          <CardDescription>
            Kelola akun staff dan atur hak akses mereka
          </CardDescription>
        </div>
        <Button onClick={handleAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Tambah User
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant={user.role === 'owner' ? 'default' : 'secondary'}>
                    {user.role === 'owner' ? 'Owner' : 'Staff'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.role === 'owner' 
                    ? <span className="text-muted-foreground">Semua Cabang</span>
                    : stores?.find(s => s.id === user.storeId)?.name || '-'
                  }
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? 'outline' : 'destructive'}>
                    {user.isActive ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(user)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    {user.role !== 'owner' && (
                      <Button variant="ghost" size="sm" onClick={() => setDeletingUser(user)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!users?.length && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Belum ada user. Klik "Tambah User" untuk menambahkan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit User' : 'Tambah User Baru'}</DialogTitle>
            <DialogDescription>
              {editingUser ? 'Update informasi user' : 'Tambahkan user baru untuk mengakses sistem'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Lengkap</FormLabel>
                      <FormControl>
                        <Input placeholder="Nama lengkap" {...field} />
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
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="email@contoh.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Username untuk login" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Password {editingUser && <span className="text-muted-foreground">(kosongkan jika tidak diubah)</span>}
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            placeholder={editingUser ? "••••••" : "Password"} 
                            {...field} 
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="owner">Owner</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Owner memiliki akses penuh ke semua cabang
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("role") === "staff" && (
                  <FormField
                    control={form.control}
                    name="storeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cabang</FormLabel>
                        <Select 
                          onValueChange={(val) => field.onChange(val ? parseInt(val) : null)} 
                          value={field.value?.toString() || ""}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih cabang" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {stores?.map((store) => (
                              <SelectItem key={store.id} value={store.id.toString()}>
                                {store.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Staff hanya bisa akses cabang yang dipilih
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>Status Aktif</FormLabel>
                      <FormDescription>
                        User yang nonaktif tidak bisa login ke sistem
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch("role") === "staff" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <h4 className="font-medium">Hak Akses</h4>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="permissions"
                    render={() => (
                      <FormItem>
                        <Accordion type="multiple" className="w-full">
                          {Object.entries(PERMISSION_GROUPS).map(([groupName, permissions]) => (
                            <AccordionItem key={groupName} value={groupName}>
                              <AccordionTrigger className="hover:no-underline">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={isGroupFullySelected(groupName)}
                                    onCheckedChange={(checked) => handleSelectAllPermissions(groupName, !!checked)}
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                  <span>{groupName}</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className="grid grid-cols-2 gap-2 pl-6">
                                  {permissions.map((permission) => (
                                    <FormField
                                      key={permission.id}
                                      control={form.control}
                                      name="permissions"
                                      render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value?.includes(permission.id)}
                                              onCheckedChange={(checked) => {
                                                if (checked) {
                                                  field.onChange([...field.value, permission.id]);
                                                } else {
                                                  field.onChange(field.value.filter((v: string) => v !== permission.id));
                                                }
                                              }}
                                            />
                                          </FormControl>
                                          <FormLabel className="text-sm font-normal cursor-pointer">
                                            {permission.label}
                                          </FormLabel>
                                        </FormItem>
                                      )}
                                    />
                                  ))}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus User?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus user "{deletingUser?.fullName}"? 
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
