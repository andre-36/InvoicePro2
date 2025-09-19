import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: number;
  name: string;
  description: string;
  currentSellingPrice: string;
}

interface QuotationItem {
  id?: number;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate?: string;
  subtotal?: string;
  taxAmount?: string;
  totalAmount?: string;
  productId: number | null;
}

interface QuotationItemRowProps {
  index: number;
  item: QuotationItem;
  products: Product[];
  onUpdate: (index: number, item: QuotationItem) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export function QuotationItemRow({ 
  index, 
  item, 
  products, 
  onUpdate, 
  onRemove,
  canRemove 
}: QuotationItemRowProps) {
  const [description, setDescription] = useState(item.description || "");
  const [quantity, setQuantity] = useState(item.quantity || "1");
  const [unitPrice, setUnitPrice] = useState(item.unitPrice || "0");
  const [taxRate, setTaxRate] = useState(item.taxRate || "0");
  const [productId, setProductId] = useState<string>(item.productId?.toString() || "");
  const [open, setOpen] = useState(false);
  
  // Calculate totals when inputs change
  useEffect(() => {
    const qty = parseFloat(quantity) || 0;
    const price = parseFloat(unitPrice) || 0;
    const rate = parseFloat(taxRate) || 0;
    
    const subtotal = qty * price;
    const taxAmount = (subtotal * rate / 100);
    const totalAmount = subtotal + taxAmount;
    
    const updatedItem: QuotationItem = {
      ...item,
      description,
      quantity,
      unitPrice,
      taxRate,
      subtotal: subtotal.toString(),
      taxAmount: taxAmount.toString(),
      totalAmount: totalAmount.toString(),
      productId: productId && productId !== "0" ? parseInt(productId) : null
    };
    
    onUpdate(index, updatedItem);
  }, [description, quantity, unitPrice, taxRate, productId, index, onUpdate, item]);
  
  // Handle product selection
  const handleProductChange = (value: string) => {
    setProductId(value);
    
    if (value && value !== "0") {
      const selectedProduct = products.find(p => p.id.toString() === value);
      if (selectedProduct) {
        setDescription(selectedProduct.name);
        setUnitPrice(selectedProduct.currentSellingPrice || "0");
      }
    }
  };

  const selectedProductName = productId && productId !== "0" 
    ? products.find(product => product.id.toString() === productId)?.name || "Enter manually"
    : "Select a product";

  return (
    <div className={cn(
      "grid grid-cols-12 gap-2 p-4 border rounded-lg",
      index % 2 === 0 ? "bg-white" : "bg-gray-50"
    )} data-testid={`quotation-item-row-${index}`}>
      {/* Product Selection */}
      <div className="col-span-12 md:col-span-3">
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Product
        </label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between text-sm"
              data-testid={`button-select-product-${index}`}
            >
              <span className="truncate text-left">
                {selectedProductName}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
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
                    value={`${product.name} ${product.description || ''}`}
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
                    <div className="flex flex-col">
                      <span className="font-medium">{product.name}</span>
                      {product.description && (
                        <span className="text-sm text-gray-500">{product.description}</span>
                      )}
                      <span className="text-sm text-green-600">
                        {formatCurrency(parseFloat(product.currentSellingPrice || "0"))}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Description */}
      <div className="col-span-12 md:col-span-3">
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Description
        </label>
        <Input
          type="text"
          placeholder="Item description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full"
          data-testid={`input-description-${index}`}
        />
      </div>

      {/* Quantity */}
      <div className="col-span-6 md:col-span-1">
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Qty
        </label>
        <Input
          type="number"
          min="0"
          step="1"
          placeholder="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full"
          data-testid={`input-quantity-${index}`}
        />
      </div>

      {/* Unit Price */}
      <div className="col-span-6 md:col-span-2">
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Unit Price
        </label>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          className="w-full"
          data-testid={`input-unit-price-${index}`}
        />
      </div>

      {/* Tax Rate */}
      <div className="col-span-6 md:col-span-1">
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Tax %
        </label>
        <Input
          type="number"
          min="0"
          step="0.1"
          placeholder="0"
          value={taxRate}
          onChange={(e) => setTaxRate(e.target.value)}
          className="w-full"
          data-testid={`input-tax-rate-${index}`}
        />
      </div>

      {/* Total */}
      <div className="col-span-6 md:col-span-1">
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Total
        </label>
        <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50">
          <span className="text-sm font-medium" data-testid={`text-total-${index}`}>
            {formatCurrency(parseFloat(item.totalAmount || "0"))}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="col-span-12 md:col-span-1">
        <label className="text-sm font-medium text-gray-700 mb-1 block opacity-0">
          Action
        </label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
          data-testid={`button-remove-item-${index}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}