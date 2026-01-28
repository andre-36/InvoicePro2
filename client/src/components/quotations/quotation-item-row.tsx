import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductUnit {
  id: number;
  productId: number;
  unitCode: string;
  unitLabel: string;
  conversionFactor: string;
  price: string | null;
  isDefault: boolean;
}

interface Product {
  id: number;
  name: string;
  description: string;
  currentSellingPrice: string;
  unit?: string; // Base unit from database (pcs, kg, meter, etc.)
  currentStock?: number;
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
  productUnitId?: number | null;
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
  const [productUnitId, setProductUnitId] = useState<string>(item.productUnitId?.toString() || "");
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
  const [open, setOpen] = useState(false);

  // Sync state when item prop changes (e.g., when loading data from API)
  useEffect(() => {
    setDescription(item.description || "");
    setQuantity(item.quantity || "1");
    setUnitPrice(item.unitPrice || "0");
    setTaxRate(item.taxRate || "0");
    setProductId(item.productId?.toString() || "");
    setProductUnitId(item.productUnitId?.toString() || "");
  }, [item.id, item.description, item.quantity, item.unitPrice, item.taxRate, item.productId, item.productUnitId]);

  // Fetch product units when product changes
  useEffect(() => {
    if (productId && productId !== "0") {
      fetch(`/api/products/${productId}/units`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : [])
        .then(units => setProductUnits(units || []))
        .catch(() => setProductUnits([]));
    } else {
      setProductUnits([]);
      setProductUnitId("");
    }
  }, [productId]);
  
  // Handle unit selection
  const handleUnitChange = (unitId: string) => {
    setProductUnitId(unitId === "base" ? "" : unitId);
    const currentProductId = productId && productId !== "0" ? parseInt(productId) : null;
    const selectedProduct = products.find(p => p.id.toString() === productId);
    
    if (unitId && unitId !== "base") {
      const selectedUnit = productUnits.find(u => u.id.toString() === unitId);
      if (selectedUnit) {
        const newPrice = selectedUnit.price || unitPrice;
        setUnitPrice(newPrice);
      }
    } else {
      // Switching back to base unit - reset price to product's original selling price
      const basePrice = selectedProduct?.currentSellingPrice || unitPrice;
      setUnitPrice(basePrice);
    }
  };

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
      productId: productId && productId !== "0" ? parseInt(productId) : null,
      productUnitId: productUnitId && productUnitId !== "" ? parseInt(productUnitId) : null
    };
    
    onUpdate(index, updatedItem);
  }, [description, quantity, unitPrice, taxRate, productId, productUnitId, index, onUpdate, item]);
  
  // Handle product selection
  const handleProductChange = (value: string) => {
    setProductId(value);
    setProductUnitId(""); // Reset unit when product changes
    
    if (value && value !== "0") {
      const selectedProduct = products.find(p => p.id.toString() === value);
      if (selectedProduct) {
        setDescription(selectedProduct.name);
        setUnitPrice(selectedProduct.currentSellingPrice || "0");
      }
    } else {
      // Reset description when switching to manual entry
      setDescription("");
      setUnitPrice("0");
    }
  };

  const selectedProductName = productId && productId !== "0" 
    ? products.find(product => product.id.toString() === productId)?.name || description || "Enter manually"
    : "Select a product";

  return (
    <div className={cn(
      "grid grid-cols-12 gap-2 p-4 border rounded-lg",
      index % 2 === 0 ? "bg-white" : "bg-gray-50"
    )} data-testid={`quotation-item-row-${index}`}>
      {/* Product Selection */}
      <div className="col-span-12 md:col-span-4">
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
              <div className="flex items-center justify-between w-full min-w-0">
                <span className="truncate text-left">
                  {selectedProductName}
                </span>
                {productId && productId !== "0" && (() => {
                  const selectedProduct = products.find(p => p.id.toString() === productId);
                  const stock = selectedProduct?.currentStock ?? 0;
                  return (
                    <span className={cn(
                      "text-xs ml-1 whitespace-nowrap",
                      stock === 0 ? "text-red-500" :
                      stock <= 5 ? "text-orange-500" : "text-gray-500"
                    )}>
                      [{stock}]
                    </span>
                  );
                })()}
              </div>
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
                    <div className="flex justify-between items-center w-full">
                      <span>{product.name}</span>
                      <span className={cn(
                        "text-xs ml-2",
                        product.currentStock === 0 ? "text-red-500" :
                        product.currentStock && product.currentStock <= 5 ? "text-orange-500" : "text-gray-500"
                      )}>
                        Stok: {product.currentStock ?? 0}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Unit Selection */}
      <div className="col-span-6 md:col-span-2">
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Unit
        </label>
        {productUnits.length > 0 ? (
          <Select value={productUnitId || "base"} onValueChange={handleUnitChange}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base">
                {products.find(p => p.id.toString() === productId)?.unit || "pcs"}
              </SelectItem>
              {productUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id.toString()}>
                  {unit.unitLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50">
            <span className="text-sm text-gray-500">
              {products.find(p => p.id.toString() === productId)?.unit || "pcs"}
            </span>
          </div>
        )}
      </div>

      {/* Quantity */}
      <div className="col-span-6 md:col-span-1">
        <label className="text-sm font-medium text-gray-700 mb-1 block">
          Qty
        </label>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            min="0"
            step="1"
            placeholder="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="flex-1"
            data-testid={`input-quantity-${index}`}
          />
          <div className="flex flex-col">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 w-6 p-0 hover:bg-gray-100"
              onClick={() => {
                const currentQty = parseFloat(quantity) || 0;
                setQuantity(String(currentQty + 1));
              }}
            >
              <ChevronUp className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 w-6 p-0 hover:bg-gray-100"
              onClick={() => {
                const currentQty = parseFloat(quantity) || 0;
                if (currentQty > 0) {
                  setQuantity(String(Math.max(0, currentQty - 1)));
                }
              }}
            >
              <ChevronDown className="h-3 w-3" />
            </Button>
          </div>
        </div>
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