import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, MapPin, Package, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { DeliveryNote, Invoice, Client, DeliveryNoteItem, InvoiceItem, Product, Category } from "@shared/schema";

type DeliveryNoteWithDetails = DeliveryNote & { 
  invoice: Invoice & { client: Client | null };
  itemCount: number;
};

type DeliveryNoteWithItems = {
  deliveryNote: DeliveryNote;
  items: (DeliveryNoteItem & { 
    invoiceItem: InvoiceItem & { product: Product } 
  })[];
};

type GroupedItem = {
  productName: string;
  categoryName: string;
  categoryId: number;
  quantity: string;
  description: string;
};

type ClientDelivery = {
  clientName: string;
  clientAddress: string;
  deliveryAddress: string;
  addressLink: string | null;
  deliveryNotes: {
    deliveryNumber: string;
    invoiceNumber: string;
    items: GroupedItem[];
  }[];
};

export default function DeliveryPlanningPage() {
  const [, navigate] = useLocation();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const { toast } = useToast();

  const { data: deliveryNotes, isLoading } = useQuery<DeliveryNoteWithDetails[]>({
    queryKey: ['/api/stores/1/delivery-notes', 'pending'],
    queryFn: async () => {
      const res = await fetch('/api/stores/1/delivery-notes?status=pending', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch delivery notes');
      return res.json();
    }
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories']
  });

  const categoryMap = new Map(categories?.map(c => [c.id, c.name]) || []);

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
    if (!deliveryNotes) return;
    if (selectedIds.size === deliveryNotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(deliveryNotes.map(n => n.id)));
    }
  };

  const getDeliveryAddress = (note: DeliveryNoteWithDetails) => {
    if (note.invoice?.deliveryAddress) {
      return note.invoice.deliveryAddress;
    }
    return note.invoice?.client?.address || '-';
  };

  const getAddressLink = (note: DeliveryNoteWithDetails) => {
    if (note.invoice?.deliveryAddressLink) {
      return note.invoice.deliveryAddressLink;
    }
    return note.invoice?.client?.addressLink || null;
  };

  const handlePrint = async () => {
    if (selectedIds.size === 0) {
      toast({
        title: "Error",
        description: "Pilih minimal satu surat jalan untuk dicetak",
        variant: "destructive"
      });
      return;
    }

    try {
      const promises = Array.from(selectedIds).map(id => 
        fetch(`/api/delivery-notes/${id}`, { credentials: 'include' }).then(res => res.json())
      );
      const selectedNotesDetails: DeliveryNoteWithItems[] = await Promise.all(promises);

      const clientMap = new Map<string, ClientDelivery>();

      selectedNotesDetails.forEach((detail) => {
        const noteInfo = deliveryNotes?.find(n => n.id === detail.deliveryNote.id);
        if (!noteInfo) return;

        const clientName = noteInfo.invoice?.client?.name || 'Unknown Client';
        const clientAddress = noteInfo.invoice?.client?.address || '-';
        const deliveryAddress = getDeliveryAddress(noteInfo);
        const addressLink = getAddressLink(noteInfo);
        const key = `${clientName}-${deliveryAddress}`;

        if (!clientMap.has(key)) {
          clientMap.set(key, {
            clientName,
            clientAddress,
            deliveryAddress,
            addressLink,
            deliveryNotes: []
          });
        }

        const items: GroupedItem[] = detail.items.map(item => ({
          productName: item.invoiceItem.product?.name || item.invoiceItem.description,
          categoryName: categoryMap.get(item.invoiceItem.product?.categoryId || 0) || 'Other',
          categoryId: item.invoiceItem.product?.categoryId || 0,
          quantity: item.deliveredQuantity,
          description: item.invoiceItem.description
        }));

        clientMap.get(key)!.deliveryNotes.push({
          deliveryNumber: detail.deliveryNote.deliveryNumber,
          invoiceNumber: noteInfo.invoice?.invoiceNumber || '-',
          items
        });
      });

      let clientDeliveries = Array.from(clientMap.values());

      if (selectedCategoryId !== "all") {
        const filterCategoryId = parseInt(selectedCategoryId);
        clientDeliveries = clientDeliveries.map(client => ({
          ...client,
          deliveryNotes: client.deliveryNotes.map(dn => ({
            ...dn,
            items: dn.items.filter(item => item.categoryId === filterCategoryId)
          })).filter(dn => dn.items.length > 0)
        })).filter(client => client.deliveryNotes.length > 0);
      }

      if (clientDeliveries.length === 0) {
        toast({
          title: "Tidak ada item",
          description: "Tidak ada item yang sesuai dengan filter kategori yang dipilih",
          variant: "destructive"
        });
        return;
      }

      const today = new Date().toLocaleDateString('id-ID', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      const filterLabel = selectedCategoryId === "all" 
        ? "Semua Kategori" 
        : categoryMap.get(parseInt(selectedCategoryId)) || "Kategori";

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Daftar Pengiriman - ${today}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            * { box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              font-size: 11px; 
              line-height: 1.4;
              margin: 0;
              padding: 0;
            }
            .header { 
              text-align: center; 
              margin-bottom: 15px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header h1 { margin: 0 0 5px 0; font-size: 18px; }
            .header p { margin: 0; color: #666; }
            .filter-badge {
              display: inline-block;
              background: #e0e0e0;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 10px;
              margin-top: 5px;
            }
            .client-section { 
              margin-bottom: 15px; 
              page-break-inside: avoid;
              border: 1px solid #ccc;
              border-radius: 4px;
              padding: 10px;
            }
            .client-header { 
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 8px;
              padding-bottom: 8px;
              border-bottom: 1px solid #eee;
            }
            .client-name { 
              font-weight: bold; 
              font-size: 13px; 
            }
            .client-address { 
              color: #333;
              font-size: 10px;
              margin-top: 3px;
            }
            .category-group { 
              margin-left: 10px;
              margin-bottom: 6px;
            }
            .category-name { 
              font-weight: bold; 
              font-size: 10px;
              color: #333;
              background: #f0f0f0;
              padding: 2px 6px;
              display: inline-block;
              margin-bottom: 3px;
            }
            .item-list { 
              margin: 0;
              padding-left: 15px;
            }
            .item-list li {
              margin-bottom: 2px;
            }
            .qty { 
              font-weight: bold; 
              color: #000;
            }
            .checkbox {
              display: inline-block;
              width: 12px;
              height: 12px;
              border: 1px solid #333;
              margin-right: 5px;
              vertical-align: middle;
            }
            .summary {
              margin-top: 20px;
              padding-top: 10px;
              border-top: 2px solid #000;
            }
            .summary-title {
              font-weight: bold;
              font-size: 12px;
              margin-bottom: 8px;
            }
            .category-summary {
              display: flex;
              flex-wrap: wrap;
              gap: 15px;
            }
            .category-total {
              background: #f5f5f5;
              padding: 8px 12px;
              border-radius: 4px;
            }
            .category-total-name {
              font-size: 10px;
              color: #666;
            }
            .category-total-count {
              font-size: 14px;
              font-weight: bold;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>DAFTAR PENGIRIMAN</h1>
            <p>${today}</p>
            <p style="margin-top: 5px;">${clientDeliveries.length} Tujuan | ${selectedIds.size} Surat Jalan</p>
            <div class="filter-badge">Filter: ${filterLabel}</div>
          </div>

          ${clientDeliveries.map((client, idx) => {
            const groupedByCategory = new Map<string, GroupedItem[]>();
            client.deliveryNotes.forEach(dn => {
              dn.items.forEach(item => {
                if (!groupedByCategory.has(item.categoryName)) {
                  groupedByCategory.set(item.categoryName, []);
                }
                groupedByCategory.get(item.categoryName)!.push(item);
              });
            });

            const priorityCategories = ['Glass', 'Aluminium Composite Panel', 'ACP'];
            const sortedCategories = Array.from(groupedByCategory.entries()).sort((a, b) => {
              const aIdx = priorityCategories.findIndex(p => a[0].toLowerCase().includes(p.toLowerCase()));
              const bIdx = priorityCategories.findIndex(p => b[0].toLowerCase().includes(p.toLowerCase()));
              if (aIdx !== -1 && bIdx === -1) return -1;
              if (aIdx === -1 && bIdx !== -1) return 1;
              return a[0].localeCompare(b[0]);
            });

            return `
              <div class="client-section">
                <div class="client-header">
                  <div>
                    <div class="client-name"><span class="checkbox"></span> ${idx + 1}. ${client.clientName}</div>
                    <div class="client-address">${client.deliveryAddress}</div>
                  </div>
                  <div style="text-align: right; font-size: 9px; color: #666;">
                    ${client.deliveryNotes.map(dn => dn.deliveryNumber).join(', ')}
                  </div>
                </div>
                ${sortedCategories.map(([catName, items]) => `
                  <div class="category-group">
                    <div class="category-name">${catName}</div>
                    <ul class="item-list">
                      ${items.map(item => `
                        <li><span class="checkbox"></span><span class="qty">${item.quantity}</span> - ${item.description}</li>
                      `).join('')}
                    </ul>
                  </div>
                `).join('')}
              </div>
            `;
          }).join('')}

          <div class="summary">
            <div class="summary-title">RINGKASAN PER KATEGORI</div>
            <div class="category-summary">
              ${(() => {
                const categoryTotals = new Map<string, number>();
                clientDeliveries.forEach(client => {
                  client.deliveryNotes.forEach(dn => {
                    dn.items.forEach(item => {
                      const current = categoryTotals.get(item.categoryName) || 0;
                      categoryTotals.set(item.categoryName, current + parseFloat(item.quantity));
                    });
                  });
                });
                return Array.from(categoryTotals.entries()).map(([cat, total]) => `
                  <div class="category-total">
                    <div class="category-total-name">${cat}</div>
                    <div class="category-total-count">${total} pcs</div>
                  </div>
                `).join('');
              })()}
            </div>
          </div>
        </body>
        </html>
      `;

      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'absolute';
      printFrame.style.top = '-10000px';
      printFrame.style.left = '-10000px';
      document.body.appendChild(printFrame);

      const frameDoc = printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(printContent);
        frameDoc.close();

        printFrame.onload = () => {
          printFrame.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        };
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data surat jalan",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate('/delivery-notes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Buat Daftar Pengiriman</h1>
          <p className="text-muted-foreground">Pilih surat jalan untuk membuat daftar pengiriman A4</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Surat Jalan Pending</CardTitle>
              <CardDescription>
                Pilih surat jalan yang akan disertakan dalam daftar pengiriman
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kategori</SelectItem>
                    {categories?.map(cat => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handlePrint} 
                disabled={selectedIds.size === 0}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Daftar Pengiriman ({selectedIds.size})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : deliveryNotes && deliveryNotes.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Checkbox 
                  checked={selectedIds.size === deliveryNotes.length}
                  onCheckedChange={toggleSelectAll}
                />
                <span className="text-sm text-muted-foreground">Pilih Semua ({deliveryNotes.length})</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {deliveryNotes.map((note) => (
                  <div 
                    key={note.id} 
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedIds.has(note.id) ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                    }`}
                    onClick={() => toggleSelection(note.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox 
                        checked={selectedIds.has(note.id)}
                        onCheckedChange={() => toggleSelection(note.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{note.deliveryNumber}</span>
                          <Badge variant="outline">{note.itemCount} item</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {note.invoice?.client?.name || '-'}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{getDeliveryAddress(note)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Tidak ada surat jalan pending</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
