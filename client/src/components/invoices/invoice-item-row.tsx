import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

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
      productId: productId ? parseInt(productId) : null
    };
    
    updateItem(index, updatedItem);
  }, [description, quantity, price, taxRate, productId, index, updateItem, item]);
  
  // Handle product selection
  const handleProductChange = (value: string) => {
    setProductId(value);
    onProductSelect(index, value ? parseInt(value) : null);
  };
  
  return (
    <tr>
      <td className="px-4 py-3">
        <div className="space-y-2">
          <Select
            value={productId}
            onValueChange={handleProductChange}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder="Select a product or enter details manually" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Enter manually</SelectItem>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id.toString()}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
