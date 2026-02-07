import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Printer, MapPin, Package, Filter, Check, Navigation, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { DeliveryNote, Invoice, Client, DeliveryNoteItem, InvoiceItem, Product, Category } from "@shared/schema";

const STORAGE_KEY = "delivery_planning_categories";

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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<number>>(new Set());
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [routeLink, setRouteLink] = useState("");
  const { toast } = useToast();

  const { data: allPendingNotes, isLoading } = useQuery<DeliveryNoteWithDetails[]>({
    queryKey: ['/api/stores/1/delivery-notes', 'pending'],
    queryFn: async () => {
      const res = await fetch('/api/stores/1/delivery-notes?status=pending', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch delivery notes');
      return res.json();
    }
  });

  const deliveryNotes = allPendingNotes?.filter(n => n.deliveryType !== 'self_pickup');

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories']
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const ids = JSON.parse(saved) as number[];
        setSelectedCategoryIds(new Set(ids));
      } catch (e) {
        console.error('Failed to parse saved categories:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedCategoryIds.size > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedCategoryIds)));
    }
  }, [selectedCategoryIds]);

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

  const toggleCategorySelection = (categoryId: number) => {
    const newSet = new Set(selectedCategoryIds);
    if (newSet.has(categoryId)) {
      newSet.delete(categoryId);
    } else {
      newSet.add(categoryId);
    }
    setSelectedCategoryIds(newSet);
  };

  const selectAllCategories = () => {
    if (categories) {
      setSelectedCategoryIds(new Set(categories.map(c => c.id)));
    }
  };

  const clearCategorySelection = () => {
    setSelectedCategoryIds(new Set());
    localStorage.removeItem(STORAGE_KEY);
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

  const generateGoogleMapsRoute = () => {
    if (selectedIds.size === 0 || !deliveryNotes) {
      toast({
        title: "Error",
        description: "Pilih minimal satu surat jalan untuk membuat rute",
        variant: "destructive"
      });
      return;
    }

    const selectedNotes = deliveryNotes.filter(n => selectedIds.has(n.id));
    
    const uniqueDestinations = new Map<string, { address: string; link: string | null }>();
    selectedNotes.forEach(note => {
      const address = getDeliveryAddress(note);
      const link = getAddressLink(note);
      if (!uniqueDestinations.has(address)) {
        uniqueDestinations.set(address, { address, link });
      }
    });

    const destinations = Array.from(uniqueDestinations.values());
    
    if (destinations.length === 0) {
      toast({
        title: "Error",
        description: "Tidak ada alamat pengiriman yang valid",
        variant: "destructive"
      });
      return;
    }

    let mapsUrl: string;
    
    if (destinations.length === 1) {
      const dest = destinations[0];
      if (dest.link) {
        mapsUrl = dest.link;
      } else {
        mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest.address)}`;
      }
    } else {
      const waypoints = destinations.map(d => {
        if (d.link) {
          const coordMatch = d.link.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
          if (coordMatch) {
            return `${coordMatch[1]},${coordMatch[2]}`;
          }
          const placeMatch = d.link.match(/place\/([^/@]+)/);
          if (placeMatch) {
            return decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
          }
        }
        return d.address;
      });

      const origin = waypoints[0];
      const destination = waypoints[waypoints.length - 1];
      const waypointsList = waypoints.slice(1, -1);

      if (waypointsList.length > 0) {
        mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&waypoints=${encodeURIComponent(waypointsList.join('|'))}&travelmode=driving`;
      } else {
        mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`;
      }
    }

    setRouteLink(mapsUrl);
    setRouteDialogOpen(true);
  };

  const copyRouteLink = async () => {
    try {
      await navigator.clipboard.writeText(routeLink);
      toast({
        title: "Berhasil",
        description: "Link rute berhasil disalin"
      });
    } catch (e) {
      toast({
        title: "Error",
        description: "Gagal menyalin link",
        variant: "destructive"
      });
    }
  };

  const openRouteInNewTab = () => {
    window.open(routeLink, '_blank');
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

    if (selectedCategoryIds.size === 0) {
      toast({
        title: "Error",
        description: "Pilih minimal satu kategori untuk ditampilkan",
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

      clientDeliveries = clientDeliveries.map(client => ({
        ...client,
        deliveryNotes: client.deliveryNotes.map(dn => ({
          ...dn,
          items: dn.items.filter(item => selectedCategoryIds.has(item.categoryId))
        })).filter(dn => dn.items.length > 0)
      })).filter(client => client.deliveryNotes.length > 0);

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

      const selectedCategoryNames = Array.from(selectedCategoryIds)
        .map(id => categoryMap.get(id))
        .filter(Boolean)
        .join(', ');

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
            <div class="filter-badge">Kategori: ${selectedCategoryNames}</div>
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

        setTimeout(() => {
          try {
            printFrame.contentWindow?.print();
          } catch (e) {
            console.error('Print failed:', e);
          }
          setTimeout(() => {
            if (printFrame.parentNode) {
              document.body.removeChild(printFrame);
            }
          }, 2000);
        }, 250);
      } else {
        document.body.removeChild(printFrame);
        toast({
          title: "Error",
          description: "Tidak dapat membuka jendela cetak",
          variant: "destructive"
        });
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
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[220px] justify-start">
                    <Filter className="h-4 w-4 mr-2" />
                    {selectedCategoryIds.size === 0 
                      ? "Pilih Kategori" 
                      : `${selectedCategoryIds.size} kategori dipilih`}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[250px] p-2" align="end">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="text-sm font-medium">Filter Kategori</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllCategories}>
                          Semua
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearCategorySelection}>
                          Hapus
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {categories?.map(cat => (
                        <div
                          key={cat.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                          onClick={() => toggleCategorySelection(cat.id)}
                        >
                          <div className={`w-4 h-4 border rounded flex items-center justify-center ${
                            selectedCategoryIds.has(cat.id) ? 'bg-primary border-primary' : 'border-input'
                          }`}>
                            {selectedCategoryIds.has(cat.id) && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <span className="text-sm">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                    {selectedCategoryIds.size > 0 && (
                      <div className="pt-2 border-t text-xs text-muted-foreground">
                        Pilihan akan tersimpan sebagai default
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              <Button 
                variant="outline"
                onClick={generateGoogleMapsRoute} 
                disabled={selectedIds.size === 0}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Generate Route
              </Button>
              <Button 
                onClick={handlePrint} 
                disabled={selectedIds.size === 0 || selectedCategoryIds.size === 0}
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

      <Dialog open={routeDialogOpen} onOpenChange={setRouteDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Google Maps Route
            </DialogTitle>
            <DialogDescription>
              Link rute pengiriman berdasarkan titik-titik yang dipilih
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={routeLink} 
                readOnly 
                className="flex-1 text-sm"
              />
              <Button variant="outline" size="icon" onClick={copyRouteLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRouteDialogOpen(false)}>
                Tutup
              </Button>
              <Button onClick={openRouteInNewTab}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Buka di Google Maps
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
