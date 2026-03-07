import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Eye, CheckCircle, XCircle, Clock, RotateCcw, CreditCard, Banknote, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatDate, formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Return, Invoice, Client } from "@shared/schema";
import { useStore } from '@/lib/store-context';

type ReturnWithDetails = Return & { 
  invoice: Invoice;
  client: Client;
};

type ReturnStatus = 'all' | 'pending' | 'completed' | 'cancelled';
type ReturnTypeFilter = 'all' | 'credit_note' | 'refund';
type SortDirection = 'asc' | 'desc';

export default function ReturnsPage() {
  const { currentStoreId } = useStore();

  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReturnStatus>("all");
  const [typeFilter, setTypeFilter] = useState<ReturnTypeFilter>("all");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnWithDetails | null>(null);
  const [editNotes, setEditNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: returns, isLoading } = useQuery<ReturnWithDetails[]>({
    queryKey: [`/api/stores/${currentStoreId}/returns`],
    staleTime: Infinity
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return apiRequest('PATCH', `/api/returns/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${currentStoreId}/returns`] });
      toast({
        title: "Status diperbarui",
        description: "Status retur berhasil diperbarui.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Gagal memperbarui status: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleMarkAsCompleted = (id: number) => {
    updateStatusMutation.mutate({ id, status: 'completed' });
  };

  const handleMarkAsCancelled = (id: number) => {
    updateStatusMutation.mutate({ id, status: 'cancelled' });
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/returns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${currentStoreId}/returns`] });
      setDeleteDialogOpen(false);
      setSelectedReturn(null);
      toast({
        title: "Berhasil",
        description: "Retur berhasil dihapus.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus retur.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      return apiRequest('PUT', `/api/returns/${id}`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${currentStoreId}/returns`] });
      setEditDialogOpen(false);
      setSelectedReturn(null);
      toast({
        title: "Berhasil",
        description: "Retur berhasil diperbarui.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal memperbarui retur.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (ret: ReturnWithDetails) => {
    setSelectedReturn(ret);
    setEditNotes(ret.notes || '');
    setEditDialogOpen(true);
  };

  const handleDelete = (ret: ReturnWithDetails) => {
    setSelectedReturn(ret);
    setDeleteDialogOpen(true);
  };

  const filteredReturns = returns?.filter(ret => {
    const matchesSearch = 
      ret.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ret.invoice?.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || ret.status === statusFilter;
    const matchesType = typeFilter === 'all' || ret.returnType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  }).sort((a, b) => {
    const dateA = new Date(a.returnDate).getTime();
    const dateB = new Date(b.returnDate).getTime();
    return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Selesai</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'credit_note':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200"><CreditCard className="h-3 w-3 mr-1" />Credit Note</Badge>;
      case 'refund':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200"><Banknote className="h-3 w-3 mr-1" />Refund</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getRemainingBalance = (ret: ReturnWithDetails) => {
    const total = Number(ret.totalAmount);
    const used = Number(ret.usedAmount);
    return total - used;
  };

  const pendingCount = returns?.filter(r => r.status === 'pending').length || 0;
  const creditNoteCount = returns?.filter(r => r.returnType === 'credit_note').length || 0;
  const refundCount = returns?.filter(r => r.returnType === 'refund').length || 0;
  const totalCreditBalance = returns?.filter(r => r.returnType === 'credit_note' && r.status === 'completed')
    .reduce((sum, r) => sum + getRemainingBalance(r), 0) || 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RotateCcw className="h-6 w-6" />
            Retur & Credit Note
          </h1>
          <p className="text-muted-foreground">Kelola retur barang dan credit note pelanggan</p>
        </div>
        <Link href="/returns/create">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Buat Retur
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-2xl">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Credit Notes</CardDescription>
            <CardTitle className="text-2xl">{creditNoteCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Refunds</CardDescription>
            <CardTitle className="text-2xl">{refundCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Credit Note</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalCreditBalance)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Cari nomor retur, pelanggan, atau invoice..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ReturnStatus)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Selesai</SelectItem>
                  <SelectItem value="cancelled">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as ReturnTypeFilter)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tipe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="credit_note">Credit Note</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}>
                {sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredReturns?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>Belum ada data retur</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Retur</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Sisa Saldo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns?.map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-medium">
                      <Link href={`/returns/${ret.id}`} className="hover:underline text-primary">
                        {ret.returnNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(ret.returnDate)}</TableCell>
                    <TableCell>{ret.client?.name}</TableCell>
                    <TableCell>
                      <Link href={`/invoices/${ret.invoiceId}`} className="hover:underline text-primary">
                        {ret.invoice?.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{getTypeBadge(ret.returnType)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(ret.totalAmount))}</TableCell>
                    <TableCell className="text-right">
                      {ret.returnType === 'credit_note' ? (
                        <span className={getRemainingBalance(ret) > 0 ? 'text-green-600 font-medium' : ''}>
                          {formatCurrency(getRemainingBalance(ret))}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(ret.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/returns/${ret.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Lihat Detail
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(ret)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {ret.status === 'pending' && (
                            <>
                              {ret.returnType === 'refund' && (
                                <DropdownMenuItem onClick={() => handleMarkAsCompleted(ret.id)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Tandai Selesai
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => handleMarkAsCancelled(ret.id)} className="text-red-600">
                                <XCircle className="h-4 w-4 mr-2" />
                                Batalkan
                              </DropdownMenuItem>
                            </>
                          )}
                          {Number(ret.usedAmount || 0) === 0 && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(ret)} className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Retur</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus retur {selectedReturn?.returnNumber}? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Batal</Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedReturn && deleteMutation.mutate(selectedReturn.id)} 
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Retur</DialogTitle>
            <DialogDescription>
              {selectedReturn && Number(selectedReturn.usedAmount || 0) > 0 
                ? "Hanya catatan yang dapat diubah karena credit note sudah digunakan."
                : "Perbarui catatan retur ini."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Catatan</Label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Catatan retur..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Batal</Button>
            <Button 
              onClick={() => selectedReturn && updateMutation.mutate({ id: selectedReturn.id, notes: editNotes })} 
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
