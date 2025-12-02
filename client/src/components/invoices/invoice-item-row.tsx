import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  productType?: 'standard' | 'bundle';
  baseUnit?: string;
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
  productUnitId?: number | null;
  selectedUnit?: ProductUnit | null;
}

interface InvoiceItemRowProps {
  index: number;
  item: InvoiceItem;
  products: Product[];
  updateItem: (index: number, item: InvoiceItem) => void;
  removeItem: (index: number) => void;
  onProductSelect: (index: number, productId: number | null, productUnitId?: number | null) => void;
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
  const [productUnitId, setProductUnitId] = useState<string>(item.productUnitId?.toString() || "");
  const [productUnits, setProductUnits] = useState<ProductUnit[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const commandRef = useRef<HTMLDivElement>(null);

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

  // Define onUpdate to be used within handleProductChange for direct state updates
  const onUpdate = (index: number, updatedItem: InvoiceItem) => {
    setProductId(updatedItem.productId?.toString() || "");
    setProductUnitId(updatedItem.productUnitId?.toString() || "");
    setDescription(updatedItem.description);
    setQuantity(updatedItem.quantity);
    setPrice(updatedItem.price);
    setTaxRate(updatedItem.taxRate);
    updateItem(index, updatedItem);
  };

  // Handle unit selection
  const handleUnitChange = (unitId: string) => {
    setProductUnitId(unitId);
    const currentProductId = productId && productId !== "0" ? parseInt(productId) : null;
    
    if (unitId && unitId !== "") {
      const selectedUnit = productUnits.find(u => u.id.toString() === unitId);
      if (selectedUnit) {
        const newPrice = selectedUnit.price || price;
        setPrice(newPrice);
        
        // Recalculate totals with new price
        const qty = parseFloat(quantity) || 0;
        const prc = parseFloat(newPrice) || 0;
        const rate = parseFloat(taxRate) || 0;
        const newSubtotal = (qty * prc).toString();
        const newTax = (parseFloat(newSubtotal) * rate / 100).toString();
        const newTotal = (parseFloat(newSubtotal) + parseFloat(newTax)).toString();
        
        const updatedItem: InvoiceItem = {
          ...item,
          productId: currentProductId,
          productUnitId: parseInt(unitId),
          selectedUnit,
          price: newPrice,
          subtotal: newSubtotal,
          tax: newTax,
          total: newTotal,
        };
        updateItem(index, updatedItem);
        onProductSelect(index, currentProductId, parseInt(unitId));
      }
    } else {
      const updatedItem: InvoiceItem = {
        ...item,
        productId: currentProductId,
        productUnitId: null,
        selectedUnit: null,
      };
      updateItem(index, updatedItem);
      onProductSelect(index, currentProductId, null);
    }
  };

  // Calculate totals when inputs change
  useEffect(() => {
    const qty = parseFloat(quantity) || 0;
    const prc = parseFloat(price) || 0;
    const rate = parseFloat(taxRate) || 0;

    const subtotal = (qty * prc).toString();
    const tax = (parseFloat(subtotal) * rate / 100).toString();
    const total = (parseFloat(subtotal) + parseFloat(tax)).toString();

    const updatedItem: InvoiceItem = {
      ...item,
      description,
      quantity,
      price,
      taxRate,
      subtotal,
      tax,
      total,
      productId: productId && productId !== "0" ? parseInt(productId) : null,
      productUnitId: productUnitId && productUnitId !== "" ? parseInt(productUnitId) : null
    };

    updateItem(index, updatedItem);
  }, [description, quantity, price, taxRate, productId, productUnitId, index, updateItem, item]);

  // Handle product selection
  const handleProductChange = (value: string) => {
    console.log('Selected product ID:', value);

    if (value === "0") {
      // Manual entry selected - clear all fields
      const clearedItem = {
        productId: 0,
        description: "",
        quantity: "1",
        price: "0",
        taxRate: "0",
        subtotal: "0",
        tax: "0",
        total: "0",
      };
      console.log('Clearing item at index', index);
      onUpdate(index, clearedItem);
    } else {
      const selectedProduct = products.find(p => p.id.toString() === value);
      console.log('Found product:', selectedProduct);

      if (selectedProduct) {
        // Calculate values based on current quantity
        const qty = parseFloat(item.quantity) || 1;
        const price = parseFloat(selectedProduct.currentSellingPrice || "0");
        const taxRate = 0; // Default tax rate, can be adjusted manually
        const subtotal = qty * price;
        const tax = subtotal * (taxRate / 100);
        const total = subtotal + tax;

        const updatedItem = {
          productId: selectedProduct.id,
          description: selectedProduct.name,
          quantity: item.quantity || "1",
          price: (selectedProduct.currentSellingPrice || "0"),
          taxRate: "0",
          subtotal: subtotal.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
        };
        console.log('Setting item at index', index, ':', updatedItem);
        onUpdate(index, updatedItem);
      }
    }
  };

  return (
    <tr className={index % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-blue-50"}>
      {/* Row number */}
      <td className="text-center text-sm text-gray-500">
        {index + 1}
      </td>

      {/* Product selection */}
      <td>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between text-sm h-8 px-2 border border-transparent hover:border-gray-300 hover:bg-gray-50"
            >
              <span className="truncate text-left">
                {productId && productId !== "0" 
                  ? products.find(product => product.id.toString() === productId)?.name || "Enter manually"
                  : "Select a product"}
              </span>
              <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0">
            <Command
              ref={commandRef}
              onKeyDown={(e) => {
                const items = [{ id: "0", name: "Enter manually" }, ...products];

                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setSelectedIndex(prev => Math.max(prev - 1, -1));
                } else if (e.key === "Enter" && selectedIndex >= 0) {
                  e.preventDefault();
                  const selectedItem = items[selectedIndex];
                  if (selectedItem) {
                    handleProductChange(selectedItem.id.toString());
                    setOpen(false);
                    setSelectedIndex(-1);
                  }
                }
              }}
            >
              <CommandInput 
                placeholder="Search product..." 
                className="h-9"
                onFocus={() => setSelectedIndex(-1)}
              />
              <CommandEmpty>No product found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="manual"
                  className={cn(
                    selectedIndex === 0 && "bg-accent"
                  )}
                  onSelect={() => {
                    handleProductChange("0");
                    setOpen(false);
                    setSelectedIndex(-1);
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
                {products.map((product, idx) => (
                  <CommandItem
                    key={product.id}
                    value={product.name}
                    className={cn(
                      selectedIndex === idx + 1 && "bg-accent"
                    )}
                    onSelect={() => {
                      handleProductChange(product.id.toString());
                      setOpen(false);
                      setSelectedIndex(-1);
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
      </td>

      {/* Unit selection (only show if product has units) */}
      <td className="w-[100px]">
        {productUnits.length > 0 ? (
          <Select value={productUnitId} onValueChange={handleUnitChange}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Base unit</SelectItem>
              {productUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id.toString()}>
                  {unit.unitLabel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-gray-400 px-2">-</span>
        )}
      </td>

      {/* Quantity */}
      <td>
        <Input
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="excel-cell-input-right"
        />
      </td>

      {/* Price */}
      <td>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <span className="text-gray-500 sm:text-xs">Rp</span>
          </div>
          <Input
            type="number"
            min="0.00"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="excel-cell-input-right pl-5 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
          />
        </div>
      </td>

      {/* Tax Rate */}
      <td>
        <Select
          value={taxRate}
          onValueChange={setTaxRate}
        >
          <SelectTrigger className="excel-cell-input-right">
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

      {/* Subtotal */}
      <td className="text-right text-sm font-medium text-gray-900">
        {formatCurrency(item.subtotal || "0")}
      </td>

      {/* Actions */}
      <td className="text-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => removeItem(index)}
          className="text-gray-400 hover:text-red-600 p-1 h-8 w-8"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete item</span>
        </Button>
      </td>
    </tr>
  );
}