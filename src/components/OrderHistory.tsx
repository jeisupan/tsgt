import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { History, Receipt, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { z } from "zod";

const orderItemSchema = z.object({
  quantity: z.number().int().positive("Quantity must be positive").max(10000, "Quantity too large"),
  price: z.number().positive("Price must be positive").max(1000000, "Price too large")
});

interface Order {
  id: string;
  order_number: string;
  subtotal: number;
  tax: number;
  total: number;
  created_at: string;
  order_items: OrderItem[];
}

interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
  line_total: number;
}

export const OrderHistory = () => {
  const { role, canEdit } = useUserRole();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);

  const canEditOrders = canEdit("orders") && (role === "sales" || role === "admin" || role === "super_admin");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (ordersError) throw ordersError;

      if (ordersData) {
        const ordersWithItems = await Promise.all(
          ordersData.map(async (order) => {
            const { data: items, error: itemsError } = await supabase
              .from("order_items")
              .select("*")
              .eq("order_id", order.id);

            if (itemsError) throw itemsError;

            return {
              ...order,
              order_items: items || [],
            };
          })
        );

        setOrders(ordersWithItems);
      }
    } catch (error: any) {
      toast.error("Failed to load order history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      // First, fetch the order details and items before deletion
      const { data: orderData, error: orderFetchError } = await supabase
        .from("orders")
        .select("order_number")
        .eq("id", orderId)
        .single();

      if (orderFetchError) throw orderFetchError;

      const { data: orderItems, error: itemsFetchError } = await supabase
        .from("order_items")
        .select("product_id, product_name, quantity")
        .eq("order_id", orderId);

      if (itemsFetchError) throw itemsFetchError;

      // Create adjustment inbound transactions for each item
      if (orderItems && orderItems.length > 0) {
        const inboundTransactions = orderItems.map(item => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          transaction_type: "adjustment",
          notes: `Adjustment due to deletion of Order #${orderData.order_number}`
        }));

        const { error: inboundError } = await supabase
          .from("inbound_transactions")
          .insert(inboundTransactions);

        if (inboundError) throw inboundError;

        // Update inventory for each product
        for (const item of orderItems) {
          const { data: inventoryData, error: inventoryFetchError } = await supabase
            .from("inventory")
            .select("current_stock")
            .eq("product_id", item.product_id)
            .single();

          if (inventoryFetchError) throw inventoryFetchError;

          const { error: inventoryUpdateError } = await supabase
            .from("inventory")
            .update({ current_stock: inventoryData.current_stock + item.quantity })
            .eq("product_id", item.product_id);

          if (inventoryUpdateError) throw inventoryUpdateError;
        }
      }

      // Delete outbound transactions first (foreign key constraint)
      const { error: transactionsError } = await supabase
        .from("outbound_transactions")
        .delete()
        .eq("order_id", orderId);

      if (transactionsError) throw transactionsError;

      // Delete order items
      const { error: itemsError } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", orderId);

      if (itemsError) throw itemsError;

      // Delete the order
      const { error: orderError } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderId);

      if (orderError) throw orderError;

      toast.success("Order deleted successfully - inventory adjusted");
      fetchOrders();
    } catch (error: any) {
      toast.error("Failed to delete order");
    }
  };

  const handleEditClick = (order: Order) => {
    setEditingOrder(order);
    setEditedItems([...order.order_items]);
  };

  const handleItemChange = (index: number, field: keyof OrderItem, value: string | number) => {
    const updated = [...editedItems];
    const numValue = Number(value);
    
    // Validate the change
    const validation = orderItemSchema.safeParse({
      quantity: field === "quantity" ? numValue : updated[index].quantity,
      price: field === "price" ? numValue : updated[index].price
    });
    
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }
    
    updated[index] = { ...updated[index], [field]: numValue };
    
    if (field === "quantity" || field === "price") {
      updated[index].line_total = Number(updated[index].quantity) * Number(updated[index].price);
    }
    
    setEditedItems(updated);
  };

  const handleSaveEdit = async () => {
    if (!editingOrder) return;

    try {
      // Calculate new totals - VAT is already included in the line totals (reverse calculation)
      const total = editedItems.reduce((sum, item) => sum + Number(item.line_total), 0);
      const subtotal = total / 1.12; // Price without VAT (VAT is already included)
      const tax = total - subtotal; // 12% VAT amount

      // Compare original and edited items to track inventory changes
      const inventoryAdjustments: Array<{
        product_id: string;
        product_name: string;
        quantityChange: number;
        originalQty: number;
        newQty: number;
      }> = [];

      for (let i = 0; i < editedItems.length; i++) {
        const editedItem = editedItems[i];
        const originalItem = editingOrder.order_items[i];
        
        if (editedItem.quantity !== originalItem.quantity) {
          // Find product_id from order_items table
          const { data: orderItemData, error: orderItemError } = await supabase
            .from("order_items")
            .select("product_id")
            .eq("order_id", editingOrder.id)
            .eq("product_name", editedItem.product_name)
            .single();

          if (orderItemError) throw orderItemError;

          inventoryAdjustments.push({
            product_id: orderItemData.product_id,
            product_name: editedItem.product_name,
            quantityChange: editedItem.quantity - originalItem.quantity,
            originalQty: originalItem.quantity,
            newQty: editedItem.quantity
          });
        }
      }

      // Process inventory adjustments
      for (const adjustment of inventoryAdjustments) {
        const absChange = Math.abs(adjustment.quantityChange);
        
        if (adjustment.quantityChange < 0) {
          // Quantity reduced - create inbound adjustment (returning stock)
          const { error: inboundError } = await supabase
            .from("inbound_transactions")
            .insert({
              product_id: adjustment.product_id,
              product_name: adjustment.product_name,
              quantity: absChange,
              transaction_type: "adjustment",
              notes: `Adjustment for Order #${editingOrder.order_number}: Reduced item count for ${adjustment.product_name} from ${adjustment.originalQty} to ${adjustment.newQty}`
            });

          if (inboundError) throw inboundError;

          // Update inventory - increase stock
          const { data: inventoryData, error: inventoryFetchError } = await supabase
            .from("inventory")
            .select("current_stock")
            .eq("product_id", adjustment.product_id)
            .single();

          if (inventoryFetchError) throw inventoryFetchError;

          const { error: inventoryUpdateError } = await supabase
            .from("inventory")
            .update({ current_stock: inventoryData.current_stock + absChange })
            .eq("product_id", adjustment.product_id);

          if (inventoryUpdateError) throw inventoryUpdateError;

        } else if (adjustment.quantityChange > 0) {
          // Quantity increased - create outbound adjustment (taking more stock)
          const { error: outboundError } = await supabase
            .from("outbound_transactions")
            .insert({
              product_id: adjustment.product_id,
              product_name: adjustment.product_name,
              quantity: absChange,
              transaction_type: "adjustment",
              notes: `Adjustment for Order #${editingOrder.order_number}: Added item count for ${adjustment.product_name} from ${adjustment.originalQty} to ${adjustment.newQty}`
            });

          if (outboundError) throw outboundError;

          // Update inventory - decrease stock
          const { data: inventoryData, error: inventoryFetchError } = await supabase
            .from("inventory")
            .select("current_stock")
            .eq("product_id", adjustment.product_id)
            .single();

          if (inventoryFetchError) throw inventoryFetchError;

          const { error: inventoryUpdateError } = await supabase
            .from("inventory")
            .update({ current_stock: inventoryData.current_stock - absChange })
            .eq("product_id", adjustment.product_id);

          if (inventoryUpdateError) throw inventoryUpdateError;
        }
      }

      // Update order totals
      const { error: orderError } = await supabase
        .from("orders")
        .update({ subtotal, tax, total })
        .eq("id", editingOrder.id);

      if (orderError) throw orderError;

      // Update each order item
      for (const item of editedItems) {
        const { error: itemError } = await supabase
          .from("order_items")
          .update({
            quantity: item.quantity,
            price: item.price,
            line_total: item.line_total,
          })
          .eq("order_id", editingOrder.id)
          .eq("product_name", item.product_name);

        if (itemError) throw itemError;
      }

      toast.success("Order updated successfully - inventory adjusted");
      setEditingOrder(null);
      fetchOrders();
    } catch (error: any) {
      toast.error("Failed to update order");
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Loading order history...</p>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
        <p className="text-lg font-semibold text-foreground mb-2">No orders yet</p>
        <p className="text-muted-foreground">Orders will appear here once completed</p>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 p-6 border-b border-border">
        <History className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Order History</h2>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="p-6 space-y-4">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="p-4 border-border bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-foreground text-lg">
                    Order #{order.order_number}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), "MMM dd, yyyy - h:mm a")}
                  </p>
                </div>
                <div className="flex items-start gap-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">
                      ₱{Number(order.total).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tax: ₱{Number(order.tax).toFixed(2)}
                    </p>
                  </div>
                  {canEditOrders && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(order)}
                        className="h-8 w-8 p-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(order.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-border">
                {order.order_items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {item.quantity}x {item.product_name}
                    </span>
                    <span className="font-semibold text-foreground">
                      ₱{Number(item.line_total).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>

      <Dialog open={!!editingOrder} onOpenChange={() => setEditingOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit Order #{editingOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {editedItems.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">{item.product_name}</Label>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor={`quantity-${index}`} className="text-xs">Quantity</Label>
                      <Input
                        id={`quantity-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor={`price-${index}`} className="text-xs">Price</Label>
                      <Input
                        id={`price-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => handleItemChange(index, "price", parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs">Line Total</Label>
                      <div className="mt-1 h-10 flex items-center px-3 rounded-md bg-muted text-sm font-semibold">
                        ₱{Number(item.line_total).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            
            <Card className="p-4 bg-muted/50">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal (excl. VAT):</span>
                  <span className="font-semibold">
                    ₱{(() => {
                      const total = editedItems.reduce((sum, item) => sum + Number(item.line_total), 0);
                      return (total / 1.12).toFixed(2);
                    })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (12% included):</span>
                  <span className="font-semibold">
                    ₱{(() => {
                      const total = editedItems.reduce((sum, item) => sum + Number(item.line_total), 0);
                      return (total - total / 1.12).toFixed(2);
                    })()}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total:</span>
                  <span className="text-primary">
                    ₱{editedItems.reduce((sum, item) => sum + Number(item.line_total), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingOrder(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
