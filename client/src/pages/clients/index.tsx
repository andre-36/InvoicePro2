import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, MoreHorizontal, Download, Upload, FileSpreadsheet, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store-context";

type Client = {
  id: number;
  clientNumber: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  addressLink: string;
  taxNumber: string;
  lastPurchase?: string | null;
};

type SortOrder = 'none' | 'asc' | 'desc';

export default function ClientsPage() {
  const { currentStoreId } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [clientNumberSort, setClientNumberSort] = useState<SortOrder>('none');
  const [nameSort, setNameSort] = useState<SortOrder>('none');
  const [lastPurchaseSort, setLastPurchaseSort] = useState<SortOrder>('none');
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: [`/api/stores/${currentStoreId}/clients`],
  });

  const toggleSort = (field: 'clientNumber' | 'name' | 'lastPurchase') => {
    const setters = { clientNumber: setClientNumberSort, name: setNameSort, lastPurchase: setLastPurchaseSort };
    const resetOthers = () => {
      if (field !== 'clientNumber') setClientNumberSort('none');
      if (field !== 'name') setNameSort('none');
      if (field !== 'lastPurchase') setLastPurchaseSort('none');
    };
    resetOthers();
    setters[field](prev => {
      if (prev === 'none') return 'asc';
      if (prev === 'asc') return 'desc';
      return 'none';
    });
  };
  
  // Delete client mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest('DELETE', `/api/clients/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${currentStoreId}/clients`] });
      toast({
        title: "Client deleted",
        description: "The client has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete client: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Export clients mutation
  const exportMutation = useMutation({
    mutationFn: async (format: 'csv' | 'xlsx') => {
      const response = await fetch(`/api/clients/export/${format}?storeId=${currentStoreId}`, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to export clients');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clients-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      return true;
    },
    onSuccess: (_, format) => {
      toast({
        title: "Export successful",
        description: `Clients exported as ${format.toUpperCase()} file.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Export failed",
        description: `Failed to export clients: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Import clients mutation
  const importMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const response = await apiRequest('POST', '/api/clients/import', { data, storeId: currentStoreId });
      return await response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: [`/api/stores/${currentStoreId}/clients`] });
      toast({
        title: "Import completed",
        description: result.message,
      });
      setImportFile(null);
      setIsImportDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Import failed",
        description: `Failed to import clients: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'csv' || fileExtension === 'xlsx') {
        setImportFile(file);
      } else {
        toast({
          title: "Invalid file",
          description: "Please select a CSV or XLSX file.",
          variant: "destructive",
        });
      }
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      const fileExtension = importFile.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'csv') {
        const text = await importFile.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
        importMutation.mutate(data);
      } else if (fileExtension === 'xlsx') {
        toast({
          title: "XLSX Import",
          description: "XLSX import is not yet supported. Please use CSV format.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "File processing error",
        description: "Failed to process the uploaded file.",
        variant: "destructive",
      });
    }
  };
  
  // Filter and sort clients
  const filteredClients = useMemo(() => {
    if (!clients) return [];
    
    let result = clients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.clientNumber.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (clientNumberSort !== 'none') {
      result = [...result].sort((a, b) => {
        const cmp = a.clientNumber.localeCompare(b.clientNumber, undefined, { numeric: true });
        return clientNumberSort === 'asc' ? cmp : -cmp;
      });
    } else if (nameSort !== 'none') {
      result = [...result].sort((a, b) => {
        const cmp = a.name.localeCompare(b.name, 'id');
        return nameSort === 'asc' ? cmp : -cmp;
      });
    } else if (lastPurchaseSort !== 'none') {
      result = [...result].sort((a, b) => {
        const dateA = a.lastPurchase ? new Date(a.lastPurchase).getTime() : 0;
        const dateB = b.lastPurchase ? new Date(b.lastPurchase).getTime() : 0;
        return lastPurchaseSort === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }
    
    return result;
  }, [clients, searchQuery, clientNumberSort, nameSort, lastPurchaseSort]);
  
  const handleViewDetails = (id: number) => {
    navigate(`/clients/${id}`);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your client information</p>
        </div>
        
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" data-testid="button-export-clients">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem 
                onClick={() => exportMutation.mutate('csv')}
                disabled={exportMutation.isPending}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => exportMutation.mutate('xlsx')}
                disabled={exportMutation.isPending}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as XLSX
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button 
            variant="outline" 
            onClick={() => setIsImportDialogOpen(true)}
            data-testid="button-import-clients"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          
          <Link href="/clients/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </Link>
        </div>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search clients..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px] whitespace-nowrap">Client #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="w-[130px]">Last Purchase</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : filteredClients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-gray-100 p-3 mb-4">
                <Search className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No clients found</h3>
              <p className="text-sm text-gray-500 mb-4 max-w-md">
                {searchQuery
                  ? "No clients match your search criteria. Try a different search term."
                  : "You haven't added any clients yet. Get started by adding your first client."}
              </p>
              {!searchQuery && (
                <Link href="/clients/create">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Client
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px] whitespace-nowrap">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3 font-medium"
                      onClick={() => toggleSort('clientNumber')}
                    >
                      Client #
                      {clientNumberSort === 'none' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                      {clientNumberSort === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
                      {clientNumberSort === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3 font-medium"
                      onClick={() => toggleSort('name')}
                    >
                      Name
                      {nameSort === 'none' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                      {nameSort === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
                      {nameSort === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
                    </Button>
                  </TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="w-[130px]">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 -ml-3 font-medium"
                      onClick={() => toggleSort('lastPurchase')}
                    >
                      Last Purchase
                      {lastPurchaseSort === 'none' && <ArrowUpDown className="ml-2 h-4 w-4" />}
                      {lastPurchaseSort === 'asc' && <ArrowUp className="ml-2 h-4 w-4" />}
                      {lastPurchaseSort === 'desc' && <ArrowDown className="ml-2 h-4 w-4" />}
                    </Button>
                  </TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow 
                    key={client.id} 
                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                    onDoubleClick={() => handleViewDetails(client.id)}
                    data-testid={`row-client-${client.id}`}
                  >
                    <TableCell className="text-gray-500 dark:text-gray-400 font-mono text-sm whitespace-nowrap" data-testid={`text-client-number-${client.id}`}>{client.clientNumber}</TableCell>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>
                      {client.phone ? (
                        <a href={`tel:${client.phone}`} className="text-blue-600 dark:text-blue-400 hover:underline" onClick={(e) => e.stopPropagation()}>
                          {client.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.address ? (
                        <span className="text-sm text-gray-600 line-clamp-1" title={client.address}>
                          {client.address}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.lastPurchase ? (
                        <span className="text-sm text-gray-600">
                          {format(new Date(client.lastPurchase), 'dd/MM/yyyy')}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => navigate(`/clients/${client.id}`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {client.name}? This action cannot be undone
                                  and will also remove all invoices associated with this client.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteMutation.mutate(client.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Clients</DialogTitle>
            <DialogDescription>
              Upload a CSV or XLSX file to import multiple clients at once.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="file-upload">Select File</Label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv,.xlsx"
                onChange={handleFileChange}
                data-testid="input-client-import-file"
              />
              <p className="text-sm text-gray-500">
                Supported formats: CSV, XLSX
              </p>
            </div>
            
            {importFile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {importFile.name}
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  File ready for import
                </p>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h4 className="font-medium text-amber-900 mb-1">Required Columns</h4>
              <p className="text-sm text-amber-800">
                Your file should include these columns: Name, Email, Phone, Address, Tax Number, Notes
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsImportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!importFile || importMutation.isPending}
              data-testid="button-confirm-client-import"
            >
              <Upload className="mr-2 h-4 w-4" />
              {importMutation.isPending ? "Importing..." : "Import Clients"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
