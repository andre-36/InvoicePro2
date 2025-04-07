import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  taxRate: string;
}

interface InvoiceItem {
  id?: number;
  description: string;
  quantity: string;
  price: string;
  taxRate: string;
  subtotal: string;
  tax: string;
  total: string;
  productId: number | null;
}

interface InvoiceItemRowProps {
  index: number;
  item: InvoiceItem;
  products: Product[];
  updateItem: (index: number, item: InvoiceItem) => void;
  removeItem: (index: number) => void;
  onProductSelect: (index: number, productId: number | null) => void;
}

export function InvoiceItemRow({ 
  index, 
  item, 
  products, 
  updateItem, 
  removeItem,
  onProductSelect
}: InvoiceItemRowProps) {
  const [description, setDescription] = useState(item.description || "");
  const [quantity, setQuantity] = useState(item.quantity || "1");
  const [price, setPrice] = useState(item.price || "0");
  const [taxRate, setTaxRate] = useState(item.taxRate || "0");
  const [productId, setProductId] = useState<string>(item.productId?.toString() || "");
  
  // Calculate totals when inputs change
  useEffect(() => {
    const qty = parseFloat(quantity) || 0;
    const prc = parseFloat(price) || 0;
    const rate = parseFloat(taxRate) || 0;
    
    const subtotal = (qty * prc).toFixed(2);
    const tax = (parseFloat(subtotal) * rate / 100).toFixed(2);
    const total = (parseFloat(subtotal) + parseFloat(tax)).toFixed(2);
    
    const updatedItem: InvoiceItem = {
      ...item,
      description,
      quantity,
      price,
      taxRate,
      subtotal,
      tax,
      total,
      productId: productId && productId !== "0" ? parseInt(productId) : null
    };
    
    updateItem(index, updatedItem);
  }, [description, quantity, price, taxRate, productId, index, updateItem, item]);
  
  // Handle product selection
  const handleProductChange = (value: string) => {
    setProductId(value);
    // If value is "0", it means "Enter manually"
    onProductSelect(index, value && value !== "0" ? parseInt(value) : null);
  };
  
  const [open, setOpen] = useState(false)

  return (
    <tr>
      <td className="px-4 py-3">
        <div className="space-y-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between text-sm"
              >
                {productId && productId !== "0" 
                  ? products.find(product => product.id.toString() === productId)?.name || "Enter manually"
                  : "Select a product or enter manually"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0">
              <Command>
                <CommandInput placeholder="Search product..." className="h-9" />
                <CommandEmpty>No product found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="manual"
                    onSelect={() => {
                      handleProductChange("0");
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        productId === "0" ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Enter manually
                  </CommandItem>
                  {products.map((product) => (
                    <CommandItem
                      key={product.id}
                      value={product.name}
                      onSelect={() => {
                        handleProductChange(product.id.toString());
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          productId === product.id.toString() ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {product.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Item description"
            className="text-sm"
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          min="0.01"
          step="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-20 text-sm"
        />
      </td>
      <td className="px-4 py-3">
        <div className="relative rounded-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <Input
            type="number"
            min="0.00"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="pl-7 w-28 text-sm"
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <Select
          value={taxRate}
          onValueChange={setTaxRate}
        >
          <SelectTrigger className="w-20 text-sm">
            <SelectValue placeholder="0%" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">0%</SelectItem>
            <SelectItem value="5">5%</SelectItem>
            <SelectItem value="7.5">7.5%</SelectItem>
            <SelectItem value="10">10%</SelectItem>
            <SelectItem value="15">15%</SelectItem>
            <SelectItem value="20">20%</SelectItem>
          </SelectContent>
        </Select>
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        ${parseFloat(item.total || "0").toFixed(2)}
      </td>
      <td className="px-4 py-3 text-right text-sm font-medium">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removeItem(index)}
          className="text-gray-400 hover:text-red-600 p-1"
        >
          <Trash2 className="h-5 w-5" />
          <span className="sr-only">Delete item</span>
        </Button>
      </td>
    </tr>
  );
}
