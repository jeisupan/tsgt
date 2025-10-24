import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Receipt } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
      console.error("Error fetching orders:", error);
      toast.error("Failed to load order history");
    } finally {
      setLoading(false);
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
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    ${Number(order.total).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tax: ${Number(order.tax).toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-border">
                {order.order_items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-foreground">
                      {item.quantity}x {item.product_name}
                    </span>
                    <span className="font-semibold text-foreground">
                      ${Number(item.line_total).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};
