import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal, Eye, CheckCircle, XCircle, Clock, Truck, MapPin, FileText, Printer, Package } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DeliveryNote, Invoice, Client } from "@shared/schema";

type DeliveryNoteWithDetails = DeliveryNote & { 
  invoice: Invoice & { client: Client | null };
  itemCount: number;
};

type DeliveryStatus = 'all' | 'pending' | 'delivered' | 'cancelled';
type SortDirection = 'asc' | 'desc';

export default function DeliveryNotesPage() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus>("all");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: deliveryNotes, isLoading } = useQuery<DeliveryNoteWithDetails[]>({
    queryKey: ['/api/stores/1/delivery-notes', statusFilter !== 'all' ? statusFilter : undefined],
    queryFn: async () => {
      const url = statusFilter !== 'all' 
        ? `/api/stores/1/delivery-notes?status=${statusFilter}`
        : '/api/stores/1/delivery-notes';
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch delivery notes');
      return res.json();
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      return apiRequest('PATCH', `/api/delivery-notes/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores/1/delivery-notes'] });
      toast({
        title: "Status diperbarui",
        description: "Status surat jalan berhasil diperbarui.",
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

  const handleMarkAsDelivered = (id: number) => {
    updateStatusMutation.mutate({ id, status: 'delivered' });
  };

  const revertToPendingMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('PUT', `/api/delivery-notes/${id}/revert-to-pending`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/stores/1/delivery-notes'] });
      toast({
        title: "Status dikembalikan",
        description: "Surat jalan dikembalikan ke pending, alokasi stok di-reverse.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Gagal mengembalikan status: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleRevertToPending = (id: number) => {
    revertToPendingMutation.mutate(id);
  };

  const handleBatchMarkAsDelivered = () => {
    selectedIds.forEach(id => {
      updateStatusMutation.mutate({ id, status: 'delivered' });
    });
    setSelectedIds(new Set());
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (!filteredNotes) return;
    if (selectedIds.size === filteredNotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotes.map(n => n.id)));
    }
  };

  const filteredNotes = deliveryNotes?.filter(note => {
    const matchesSearch = 
      note.deliveryNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.invoice?.client?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.invoice?.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => {
    const dateA = new Date(a.deliveryDate).getTime();
    const dateB = new Date(b.deliveryDate).getTime();
    return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Delivered</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getDeliveryAddress = (note: DeliveryNoteWithDetails) => {
    if (note.invoice?.deliveryAddress) {
      return note.invoice.deliveryAddress;
    }
    return note.invoice?.client?.address || '-';
  };

  const pendingCount = deliveryNotes?.filter(n => n.status === 'pending').length || 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Surat Jalan</h1>
          <p className="text-muted-foreground">Kelola dan lacak status pengiriman</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button onClick={handleBatchMarkAsDelivered} variant="default">
              <CheckCircle className="h-4 w-4 mr-2" />
              Tandai {selectedIds.size} Selesai
            </Button>
          )}
          <Button onClick={() => navigate('/delivery-notes/planning')} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Buat Daftar Pengiriman
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Delivered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {deliveryNotes?.filter(n => n.status === 'delivered').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deliveryNotes?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor surat jalan, invoice, atau client..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DeliveryStatus)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSortDirection(d => d === 'desc' ? 'asc' : 'desc')}
              >
                {sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredNotes && filteredNotes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox 
                      checked={selectedIds.size === filteredNotes.length && filteredNotes.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>No. Surat Jalan</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Alamat Pengiriman</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotes.map((note) => (
                  <TableRow key={note.id} className={note.status === 'pending' ? 'bg-yellow-50/50' : ''}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.has(note.id)}
                        onCheckedChange={() => toggleSelection(note.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <Link href={`/invoices/${note.invoiceId}`} className="hover:underline text-primary">
                        {note.deliveryNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {note.invoice?.client?.name || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={note.deliveryType === 'self_pickup' ? 'outline' : 'secondary'} className="text-xs">
                        {note.deliveryType === 'self_pickup' ? (
                          <><Package className="h-3 w-3 mr-1" />Self Pickup</>
                        ) : (
                          <><Truck className="h-3 w-3 mr-1" />Delivery</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={getDeliveryAddress(note)}>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{getDeliveryAddress(note)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/invoices/${note.invoiceId}`} className="hover:underline text-muted-foreground">
                        {note.invoice?.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(note.deliveryDate)}</TableCell>
                    <TableCell>{note.itemCount} item</TableCell>
                    <TableCell>{getStatusBadge(note.status)}</TableCell>
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
                          <DropdownMenuItem onClick={() => navigate(`/invoices/${note.invoiceId}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Lihat Invoice
                          </DropdownMenuItem>
                          {note.status === 'pending' && (
                            <DropdownMenuItem onClick={() => handleMarkAsDelivered(note.id)}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Tandai Selesai
                            </DropdownMenuItem>
                          )}
                          {note.status === 'delivered' && (
                            <DropdownMenuItem onClick={() => handleRevertToPending(note.id)}>
                              <Clock className="h-4 w-4 mr-2" />
                              Kembalikan ke Pending
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada surat jalan ditemukan</p>
              <p className="text-sm mt-1">Surat jalan dibuat dari halaman Invoice</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
