import { useState, useEffect } from "react";
import { ShoppingCart, Trash2, Plus, Minus, UserPlus, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { CustomerDialog } from "@/components/CustomerDialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";

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
  onCheckout: (customerId: string, invoiceNumber?: string) => void;
}

export const Cart = ({ items, onUpdateQuantity, onRemoveItem, onCheckout }: CartProps) => {
  const { tierLimits } = useSubscription();
  const isFreeTier = tierLimits.tierName === "Free Trial";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [open, setOpen] = useState(false);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = total / 1.12; // Price without VAT (VAT is already included in price)
  const tax = total - subtotal; // 12% VAT amount

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id, name")
      .eq("is_active", true)
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
    onCheckout(selectedCustomerId, invoiceNumber || undefined);
    setSelectedCustomerId("");
    setInvoiceNumber("");
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
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="flex-1 justify-between"
                  >
                    {selectedCustomerId
                      ? customers.find((customer) => customer.id === selectedCustomerId)?.name
                      : "Search customer..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search customer by name..." />
                    <CommandList>
                      <CommandEmpty>No customer found.</CommandEmpty>
                      <CommandGroup>
                        {customers.map((customer) => (
                          <CommandItem
                            key={customer.id}
                            value={customer.name}
                            onSelect={() => {
                              setSelectedCustomerId(customer.id);
                              setOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCustomerId === customer.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {customer.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
          {!isFreeTier && (
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Invoice / OR Number (Optional)
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Enter invoice or OR number"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal (excl. VAT)</span>
            <span>₱{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>VAT (12% included)</span>
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
