import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Printer, CheckCircle, MapPin, Package, Layers, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
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
  const [showPreview, setShowPreview] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const toggleClientExpand = (clientName: string) => {
    const newSet = new Set(expandedClients);
    if (newSet.has(clientName)) {
      newSet.delete(clientName);
    } else {
      newSet.add(clientName);
    }
    setExpandedClients(newSet);
  };

  const { data: selectedNotesDetails, isLoading: isLoadingDetails } = useQuery<DeliveryNoteWithItems[]>({
    queryKey: ['/api/delivery-notes/details', Array.from(selectedIds)],
    queryFn: async () => {
      const promises = Array.from(selectedIds).map(id => 
        fetch(`/api/delivery-notes/${id}`, { credentials: 'include' }).then(res => res.json())
      );
      return Promise.all(promises);
    },
    enabled: selectedIds.size > 0 && showPreview
  });

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

  const prepareClientDeliveries = (): ClientDelivery[] => {
    if (!selectedNotesDetails || !deliveryNotes) return [];

    const clientMap = new Map<string, ClientDelivery>();

    selectedNotesDetails.forEach((detail) => {
      const noteInfo = deliveryNotes.find(n => n.id === detail.deliveryNote.id);
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
        quantity: item.deliveredQuantity,
        description: item.invoiceItem.description
      }));

      clientMap.get(key)!.deliveryNotes.push({
        deliveryNumber: detail.deliveryNote.deliveryNumber,
        invoiceNumber: noteInfo.invoice?.invoiceNumber || '-',
        items
      });
    });

    return Array.from(clientMap.values());
  };

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({
        title: "Error",
        description: "Tidak dapat membuka jendela cetak. Pastikan popup tidak diblokir.",
        variant: "destructive"
      });
      return;
    }

    const clientDeliveries = prepareClientDeliveries();
    const today = new Date().toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    printWindow.document.write(`
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
          .delivery-note { 
            margin-left: 10px;
            margin-bottom: 8px;
          }
          .dn-header {
            font-weight: bold;
            font-size: 10px;
            color: #555;
            margin-bottom: 4px;
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

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const clientDeliveries = showPreview ? prepareClientDeliveries() : [];

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Surat Jalan Pending</CardTitle>
            <CardDescription>
              Pilih surat jalan yang akan disertakan dalam daftar pengiriman
            </CardDescription>
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
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Tidak ada surat jalan pending</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Preview Daftar Pengiriman</CardTitle>
                <CardDescription>
                  {selectedIds.size} surat jalan dipilih
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {selectedIds.size > 0 && !showPreview && (
                  <Button onClick={() => setShowPreview(true)}>
                    <Layers className="h-4 w-4 mr-2" />
                    Lihat Preview
                  </Button>
                )}
                {showPreview && (
                  <Button onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-2" />
                    Cetak A4
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent ref={printRef}>
            {selectedIds.size === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Pilih surat jalan dari daftar di sebelah kiri</p>
              </div>
            ) : !showPreview ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Klik "Lihat Preview" untuk melihat daftar pengiriman</p>
              </div>
            ) : isLoadingDetails ? (
              <div className="space-y-4">
                {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {clientDeliveries.map((client, idx) => (
                  <div key={`${client.clientName}-${idx}`} className="border rounded-lg">
                    <div 
                      className="p-3 bg-accent/50 cursor-pointer flex items-center justify-between"
                      onClick={() => toggleClientExpand(client.clientName + idx)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{idx + 1}. {client.clientName}</span>
                          <Badge variant="outline" className="text-xs">
                            {client.deliveryNotes.reduce((sum, dn) => sum + dn.items.length, 0)} item
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {client.deliveryAddress}
                          {client.addressLink && (
                            <a 
                              href={client.addressLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline ml-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                      {expandedClients.has(client.clientName + idx) ? (
                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    {expandedClients.has(client.clientName + idx) && (
                      <div className="p-3 space-y-3">
                        {client.deliveryNotes.map((dn) => {
                          const groupedByCategory = new Map<string, GroupedItem[]>();
                          dn.items.forEach(item => {
                            if (!groupedByCategory.has(item.categoryName)) {
                              groupedByCategory.set(item.categoryName, []);
                            }
                            groupedByCategory.get(item.categoryName)!.push(item);
                          });

                          return (
                            <div key={dn.deliveryNumber}>
                              <div className="text-xs font-medium text-muted-foreground mb-2">
                                {dn.deliveryNumber} ({dn.invoiceNumber})
                              </div>
                              {Array.from(groupedByCategory.entries()).map(([catName, items]) => (
                                <div key={catName} className="ml-2 mb-2">
                                  <Badge variant="secondary" className="text-xs mb-1">{catName}</Badge>
                                  <ul className="text-sm ml-4 list-disc">
                                    {items.map((item, itemIdx) => (
                                      <li key={itemIdx}>
                                        <span className="font-medium">{item.quantity}</span> - {item.description}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}

                {clientDeliveries.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-medium mb-2">Ringkasan per Kategori</h4>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const categoryTotals = new Map<string, number>();
                        clientDeliveries.forEach(client => {
                          client.deliveryNotes.forEach(dn => {
                            dn.items.forEach(item => {
                              const current = categoryTotals.get(item.categoryName) || 0;
                              categoryTotals.set(item.categoryName, current + parseFloat(item.quantity));
                            });
                          });
                        });
                        return Array.from(categoryTotals.entries()).map(([cat, total]) => (
                          <Badge key={cat} variant="outline" className="text-sm">
                            {cat}: {total} pcs
                          </Badge>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
