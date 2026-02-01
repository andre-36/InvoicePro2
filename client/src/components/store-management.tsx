import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Building2, Plus, Pencil, Trash2 } from "lucide-react";

type Store = {
  id: number;
  name: string;
  address?: string | null;
  phone?: string | null;
};

export function StoreManagement() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  const { data: stores, isLoading } = useQuery<Store[]>({
    queryKey: ['/api/stores'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; address?: string; phone?: string }) => {
      return apiRequest("POST", "/api/stores", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      toast({ title: "Berhasil", description: "Cabang berhasil ditambahkan" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Gagal menambahkan cabang", 
        variant: "destructive" 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; address?: string; phone?: string } }) => {
      return apiRequest("PATCH", `/api/stores/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      toast({ title: "Berhasil", description: "Cabang berhasil diperbarui" });
      closeDialog();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Gagal memperbarui cabang", 
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/stores/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores'] });
      toast({ title: "Berhasil", description: "Cabang berhasil dihapus" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Gagal menghapus cabang", 
        variant: "destructive" 
      });
    },
  });

  const openAddDialog = () => {
    setEditingStore(null);
    setName("");
    setAddress("");
    setPhone("");
    setDialogOpen(true);
  };

  const openEditDialog = (store: Store) => {
    setEditingStore(store);
    setName(store.name);
    setAddress(store.address || "");
    setPhone(store.phone || "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingStore(null);
    setName("");
    setAddress("");
    setPhone("");
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Nama cabang harus diisi", variant: "destructive" });
      return;
    }

    const data = { 
      name: name.trim(), 
      address: address.trim() || undefined, 
      phone: phone.trim() || undefined 
    };

    if (editingStore) {
      updateMutation.mutate({ id: editingStore.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (store: Store) => {
    if (confirm(`Hapus cabang "${store.name}"?`)) {
      deleteMutation.mutate(store.id);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Manajemen Cabang
            </CardTitle>
            <CardDescription>Kelola cabang/toko untuk bisnis Anda</CardDescription>
          </div>
          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah Cabang
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Memuat...</div>
          ) : stores && stores.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Cabang</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead className="w-[100px]">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stores.map((store) => (
                  <TableRow key={store.id}>
                    <TableCell className="font-medium">{store.name}</TableCell>
                    <TableCell>{store.address || "-"}</TableCell>
                    <TableCell>{store.phone || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(store)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(store)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Belum ada cabang. Klik "Tambah Cabang" untuk menambahkan.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStore ? "Edit Cabang" : "Tambah Cabang"}</DialogTitle>
            <DialogDescription>
              {editingStore ? "Perbarui informasi cabang" : "Tambahkan cabang baru"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Nama Cabang *</Label>
              <Input
                id="storeName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Cabang Pusat"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storeAddress">Alamat</Label>
              <Input
                id="storeAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Alamat cabang"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="storePhone">Telepon</Label>
              <Input
                id="storePhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Nomor telepon cabang"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={closeDialog}>
                Batal
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
