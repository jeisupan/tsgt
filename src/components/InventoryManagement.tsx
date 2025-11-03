import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Package, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";

interface ProductFromDB {
  id: string;
  product_id: string;
  name: string;
  price: number;
  category: string;
  image_url: string | null;
}

interface InventoryItem {
  id: string;
  product_id: string;
  product_name: string;
  product_category: string;
  current_stock: number;
  min_stock_level: number;
  updated_at: string;
}

interface InboundTransaction {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  transaction_type: string;
  supplier: string | null;
  notes: string | null;
  created_at: string;
}

interface OutboundTransaction {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  transaction_type: string;
  destination: string | null;
  notes: string | null;
  created_at: string;
}

export const InventoryManagement = () => {
  const { role, canEdit } = useUserRole();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [inboundHistory, setInboundHistory] = useState<InboundTransaction[]>([]);
  const [outboundHistory, setOutboundHistory] = useState<OutboundTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductFromDB[]>([]);
  const [activeTab, setActiveTab] = useState("inventory");

  const canEditInventory = canEdit("inventory") && (role === "inventory" || role === "admin" || role === "super_admin");

  // Inbound form state
  const [inboundProductId, setInboundProductId] = useState("");
  const [inboundQuantity, setInboundQuantity] = useState("");
  const [inboundType, setInboundType] = useState("purchase");
  const [inboundSupplier, setInboundSupplier] = useState("");
  const [inboundNotes, setInboundNotes] = useState("");

  // Outbound form state
  const [outboundProductId, setOutboundProductId] = useState("");
  const [outboundQuantity, setOutboundQuantity] = useState("");
  const [outboundType, setOutboundType] = useState("transfer");
  const [outboundDestination, setOutboundDestination] = useState("");
  const [outboundNotes, setOutboundNotes] = useState("");

  useEffect(() => {
    fetchProducts();
    fetchInventory();
    fetchInboundHistory();
    fetchOutboundHistory();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("category", { ascending: true });
    
    if (error) {
      console.error("Error fetching products:", error);
    } else {
      setProducts(data || []);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .order("product_name");

    if (error) {
      toast.error("Failed to load inventory");
      console.error(error);
    } else {
      setInventory(data || []);
    }
    setLoading(false);
  };

  const fetchInboundHistory = async () => {
    const { data, error } = await supabase
      .from("inbound_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
    } else {
      setInboundHistory(data || []);
    }
  };

  const fetchOutboundHistory = async () => {
    const { data, error } = await supabase
      .from("outbound_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error(error);
    } else {
      setOutboundHistory(data || []);
    }
  };

  const handleInboundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseInt(inboundQuantity);
    if (!inboundProductId || quantity <= 0) {
      toast.error("Please select a product and enter a valid quantity");
      return;
    }

    const product = products.find(p => p.product_id === inboundProductId);
    if (!product) return;

    try {
      // Insert inbound transaction
      const { error: transactionError } = await supabase
        .from("inbound_transactions")
        .insert({
          product_id: inboundProductId,
          product_name: product.name,
          quantity: quantity,
          transaction_type: inboundType,
          supplier: inboundSupplier || null,
          notes: inboundNotes || null,
        });

      if (transactionError) throw transactionError;

      // Check if product exists in inventory
      const { data: existingInventory } = await supabase
        .from("inventory")
        .select("*")
        .eq("product_id", inboundProductId)
        .single();

      if (existingInventory) {
        // Update existing inventory
        const { error: updateError } = await supabase
          .from("inventory")
          .update({ current_stock: existingInventory.current_stock + quantity })
          .eq("product_id", inboundProductId);

        if (updateError) throw updateError;
      } else {
        // Create new inventory record
        const { error: insertError } = await supabase
          .from("inventory")
          .insert({
            product_id: inboundProductId,
            product_name: product.name,
            product_category: product.category,
            current_stock: quantity,
          });

        if (insertError) throw insertError;
      }

      toast.success(`Added ${quantity} units of ${product.name}`);
      
      // Reset form
      setInboundProductId("");
      setInboundQuantity("");
      setInboundSupplier("");
      setInboundNotes("");
      
      // Refresh data and switch to inventory tab
      fetchInventory();
      fetchInboundHistory();
      setActiveTab("inventory");
    } catch (error: any) {
      console.error("Error adding inbound stock:", error);
      toast.error("Failed to add stock");
    }
  };

  const handleOutboundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const quantity = parseInt(outboundQuantity);
    if (!outboundProductId || quantity <= 0) {
      toast.error("Please select a product and enter a valid quantity");
      return;
    }

    const product = products.find(p => p.product_id === outboundProductId);
    if (!product) return;

    try {
      // Check current stock
      const { data: inventoryData } = await supabase
        .from("inventory")
        .select("*")
        .eq("product_id", outboundProductId)
        .single();

      if (!inventoryData || inventoryData.current_stock < quantity) {
        toast.error("Insufficient stock");
        return;
      }

      // Insert outbound transaction
      const { error: transactionError } = await supabase
        .from("outbound_transactions")
        .insert({
          product_id: outboundProductId,
          product_name: product.name,
          quantity: quantity,
          transaction_type: outboundType,
          destination: outboundDestination || null,
          notes: outboundNotes || null,
        });

      if (transactionError) throw transactionError;

      // Update inventory
      const { error: updateError } = await supabase
        .from("inventory")
        .update({ current_stock: inventoryData.current_stock - quantity })
        .eq("product_id", outboundProductId);

      if (updateError) throw updateError;

      toast.success(`Removed ${quantity} units of ${product.name}`);
      
      // Reset form
      setOutboundProductId("");
      setOutboundQuantity("");
      setOutboundDestination("");
      setOutboundNotes("");
      
      // Refresh data
      fetchInventory();
      fetchOutboundHistory();
    } catch (error: any) {
      console.error("Error processing outbound stock:", error);
      toast.error("Failed to process stock removal");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-primary" />
        <h2 className="text-3xl font-bold">Inventory Management</h2>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="inventory">Current Stock</TabsTrigger>
          <TabsTrigger value="inbound">Inbound</TabsTrigger>
          <TabsTrigger value="outbound">Outbound</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Current Inventory Levels</h3>
            {loading ? (
              <p>Loading...</p>
            ) : inventory.length === 0 ? (
              <p className="text-muted-foreground">No inventory data. Add inbound stock to get started.</p>
            ) : (
              <div className="space-y-3">
                {inventory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div>
                      <h4 className="font-semibold">{item.product_name}</h4>
                      <p className="text-sm text-muted-foreground">{item.product_category}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {item.current_stock <= item.min_stock_level && (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                      <div className="text-right">
                        <p className="text-2xl font-bold">{item.current_stock}</p>
                        <p className="text-xs text-muted-foreground">units in stock</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="inbound" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">Add Inbound Stock</h3>
            </div>
            <form onSubmit={handleInboundSubmit} className="space-y-4">
              <div>
                <Label htmlFor="inbound-product">Product</Label>
                <Select value={inboundProductId} onValueChange={setInboundProductId} disabled={!canEditInventory}>
                  <SelectTrigger id="inbound-product">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.product_id} value={product.product_id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="inbound-quantity">Quantity</Label>
                <Input
                  id="inbound-quantity"
                  type="number"
                  min="1"
                  value={inboundQuantity}
                  onChange={(e) => setInboundQuantity(e.target.value)}
                  placeholder="Enter quantity"
                  disabled={!canEditInventory}
                />
              </div>

              <div>
                <Label htmlFor="inbound-type">Transaction Type</Label>
                <Select value={inboundType} onValueChange={setInboundType}>
                  <SelectTrigger id="inbound-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="inbound-supplier">Supplier (Optional)</Label>
                <Input
                  id="inbound-supplier"
                  value={inboundSupplier}
                  onChange={(e) => setInboundSupplier(e.target.value)}
                  placeholder="Enter supplier name"
                />
              </div>

              <div>
                <Label htmlFor="inbound-notes">Notes (Optional)</Label>
                <Textarea
                  id="inbound-notes"
                  value={inboundNotes}
                  onChange={(e) => setInboundNotes(e.target.value)}
                  placeholder="Add any notes"
                />
              </div>

              <Button type="submit" className="w-full">
                Add Stock
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Inbound History</h3>
            <div className="space-y-3">
              {inboundHistory.length === 0 ? (
                <p className="text-muted-foreground">No inbound transactions yet</p>
              ) : (
                inboundHistory.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div>
                      <h4 className="font-semibold">{transaction.product_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {transaction.transaction_type}
                        {transaction.supplier && ` • ${transaction.supplier}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-green-600">+{transaction.quantity}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="outbound" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingDown className="h-5 w-5 text-primary" />
              <h3 className="text-xl font-semibold">Process Outbound Stock</h3>
            </div>
            <form onSubmit={handleOutboundSubmit} className="space-y-4">
              <div>
                <Label htmlFor="outbound-product">Product</Label>
                <Select value={outboundProductId} onValueChange={setOutboundProductId}>
                  <SelectTrigger id="outbound-product">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.product_id} value={product.product_id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="outbound-quantity">Quantity</Label>
                <Input
                  id="outbound-quantity"
                  type="number"
                  min="1"
                  value={outboundQuantity}
                  onChange={(e) => setOutboundQuantity(e.target.value)}
                  placeholder="Enter quantity"
                />
              </div>

              <div>
                <Label htmlFor="outbound-type">Transaction Type</Label>
                <Select value={outboundType} onValueChange={setOutboundType}>
                  <SelectTrigger id="outbound-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="delivery">Delivery</SelectItem>
                    <SelectItem value="damage">Damage/Loss</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="outbound-destination">Destination (Optional)</Label>
                <Input
                  id="outbound-destination"
                  value={outboundDestination}
                  onChange={(e) => setOutboundDestination(e.target.value)}
                  placeholder="Branch/warehouse name"
                />
              </div>

              <div>
                <Label htmlFor="outbound-notes">Notes (Optional)</Label>
                <Textarea
                  id="outbound-notes"
                  value={outboundNotes}
                  onChange={(e) => setOutboundNotes(e.target.value)}
                  placeholder="Add any notes"
                />
              </div>

              <Button type="submit" className="w-full">
                Process Outbound
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Outbound History</h3>
            <div className="space-y-3">
              {outboundHistory.length === 0 ? (
                <p className="text-muted-foreground">No outbound transactions yet</p>
              ) : (
                outboundHistory.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg"
                  >
                    <div>
                      <h4 className="font-semibold">{transaction.product_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {transaction.transaction_type}
                        {transaction.destination && ` • ${transaction.destination}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-red-600">-{transaction.quantity}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};