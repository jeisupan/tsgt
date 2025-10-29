import { useState, useEffect } from "react";
import { ShoppingCart, Trash2, Plus, Minus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { CustomerDialog } from "@/components/CustomerDialog";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Customer {
  id: string;
  name: string;
}

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemoveItem: (id: string) => void;
  onCheckout: (customerId: string) => void;
}

export const Cart = ({ items, onUpdateQuantity, onRemoveItem, onCheckout }: CartProps) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.12; // 12% tax
  const total = subtotal + tax;

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .order("name");
    
    if (error) {
      console.error("Error fetching customers:", error);
      return;
    }
    setCustomers(data || []);
  };

  const handleCheckout = () => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer before checkout");
      return;
    }
    onCheckout(selectedCustomerId);
    setSelectedCustomerId("");
  };

  const handleCustomerAdded = () => {
    fetchCustomers();
  };

  return (
    <Card className="flex flex-col h-full border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 p-6 border-b border-border">
        <ShoppingCart className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Current Order</h2>
      </div>

      <ScrollArea className="flex-1 p-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">Cart is empty</p>
            <p className="text-muted-foreground text-sm mt-2">Add items to start an order</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    ₱{item.price.toFixed(2)} each
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-semibold text-foreground">
                    {item.quantity}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onRemoveItem(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="font-bold text-foreground min-w-[80px] text-right">
                  ₱{(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      <div className="p-6 border-t border-border space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Customer *
            </label>
            <div className="flex gap-2">
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setShowCustomerDialog(true)}
                title="Add new customer"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Separator />
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>₱{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Tax (12%)</span>
            <span>₱{tax.toFixed(2)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-xl font-bold text-foreground">
            <span>Total</span>
            <span className="text-primary">₱{total.toFixed(2)}</span>
          </div>
        </div>
        <Button
          className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-accent to-[hsl(140,75%,50%)] hover:shadow-lg transition-all"
          disabled={items.length === 0 || !selectedCustomerId}
          onClick={handleCheckout}
        >
          Complete Order
        </Button>
      </div>

      <CustomerDialog
        open={showCustomerDialog}
        onOpenChange={setShowCustomerDialog}
        onCustomerAdded={handleCustomerAdded}
      />
    </Card>
  );
};
