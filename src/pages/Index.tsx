import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { ProductCard, Product } from "@/components/ProductCard";
import { Cart, CartItem } from "@/components/Cart";
import { CategoryFilter } from "@/components/CategoryFilter";
import { OrderHistory } from "@/components/OrderHistory";
import { InventoryManagement } from "@/components/InventoryManagement";
import { CustomerManagement } from "@/components/CustomerManagement";
import { SupplierManagement } from "@/components/SupplierManagement";
import { OperationsExpense } from "@/components/OperationsExpense";
import { Fuel, Receipt, Package, Users, Truck, FileText, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { UserManagement } from "@/components/UserManagement";
import gasCylinderLarge from "@/assets/gas-cylinder-large.jpg";
import gasCylinderMedium from "@/assets/gas-cylinder-medium.jpg";
import gasCylinderSmall from "@/assets/gas-cylinder-small.jpg";
import gasRegulator from "@/assets/gas-regulator.jpg";
import gasHose from "@/assets/gas-hose.jpg";

// Gas station products data - exported for inventory component
export const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "LPG Cylinder - 45kg",
    price: 89.99,
    category: "Cylinders",
    details: "Commercial grade, full refill",
    image: gasCylinderLarge,
  },
  {
    id: "2",
    name: "LPG Cylinder - 15kg",
    price: 34.99,
    category: "Cylinders",
    details: "Standard household size",
    image: gasCylinderLarge,
  },
  {
    id: "3",
    name: "LPG Cylinder - 12kg",
    price: 28.99,
    category: "Cylinders",
    details: "Medium household size",
    image: gasCylinderMedium,
  },
  {
    id: "4",
    name: "LPG Cylinder - 5kg",
    price: 15.99,
    category: "Cylinders",
    details: "Portable camping size",
    image: gasCylinderSmall,
  },
  {
    id: "5",
    name: "Gas Regulator",
    price: 24.99,
    category: "Accessories",
    details: "Universal fit, safety certified",
    image: gasRegulator,
  },
  {
    id: "6",
    name: "Gas Hose - 2m",
    price: 12.99,
    category: "Accessories",
    details: "Flexible rubber hose",
    image: gasHose,
  },
  {
    id: "7",
    name: "Cylinder Refill",
    price: 19.99,
    category: "Services",
    details: "Refill your empty cylinder",
    image: gasCylinderMedium,
  },
  {
    id: "8",
    name: "Cylinder Exchange",
    price: 29.99,
    category: "Services",
    details: "Exchange empty for full",
    image: gasCylinderLarge,
  },
];

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { role, loading: roleLoading, hasAccess } = useUserRole();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showHistory, setShowHistory] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [showCustomers, setShowCustomers] = useState(false);
  const [showSuppliers, setShowSuppliers] = useState(false);
  const [showExpenses, setShowExpenses] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [inventory, setInventory] = useState<Record<string, number>>({});

  const categories = Array.from(new Set(PRODUCTS.map((p) => p.category)));

  useEffect(() => {
    // Check authentication status
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setLoading(false);
      } else {
        navigate("/auth");
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setLoading(false);
      } else {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchInventory();
      
      // Subscribe to real-time inventory updates
      const channel = supabase
        .channel('inventory-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inventory'
          },
          (payload) => {
            console.log('Inventory changed:', payload);
            // Refresh inventory on any change (INSERT, UPDATE, DELETE)
            fetchInventory();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchInventory = async () => {
    const { data, error } = await supabase.from("inventory").select("product_id, current_stock");
    if (error) {
      console.error("Error fetching inventory:", error);
      return;
    }
    const inventoryMap: Record<string, number> = {};
    data.forEach((item) => {
      inventoryMap[item.product_id] = item.current_stock;
    });
    setInventory(inventoryMap);
  };

  const filteredProducts =
    selectedCategory === "All"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === selectedCategory);

  const handleAddToCart = (product: Product) => {
    const availableStock = inventory[product.id] || 0;
    const currentQuantityInCart = cartItems.find((item) => item.id === product.id)?.quantity || 0;
    
    if (availableStock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    
    if (currentQuantityInCart >= availableStock) {
      toast.error(`Only ${availableStock} units available in stock`);
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    toast.success(`Added ${product.name} to cart`);
  };

  const handleUpdateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(id);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    const item = cartItems.find((i) => i.id === id);
    setCartItems((prev) => prev.filter((item) => item.id !== id));
    if (item) {
      toast.info(`Removed ${item.name} from cart`);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8 bg-card rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">No Role Assigned</h2>
          <p className="text-muted-foreground mb-6">
            Your account doesn't have a role assigned yet. Please contact your administrator to get access.
          </p>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    );
  }

  const handleCheckout = async (customerId: string) => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const tax = subtotal * 0.12; // 12% tax
    const total = subtotal + tax;

    try {
      // Generate order number
      const orderNumber = `ORD${Date.now().toString().slice(-8)}`;

      // Insert order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          subtotal: subtotal,
          tax: tax,
          total: total,
          customer_id: customerId,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItems = cartItems.map((item) => ({
        order_id: orderData.id,
        product_id: item.id,
        product_name: item.name,
        product_category: PRODUCTS.find((p) => p.id === item.id)?.category || "Unknown",
        price: item.price,
        quantity: item.quantity,
        line_total: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Create outbound transactions for each item (sale) and update inventory
      for (const item of cartItems) {
        // Insert outbound transaction
        await supabase.from("outbound_transactions").insert({
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          transaction_type: "sale",
          order_id: orderData.id,
        });

        // Update inventory
        const { data: inventoryData } = await supabase
          .from("inventory")
          .select("current_stock")
          .eq("product_id", item.id)
          .single();

        if (inventoryData) {
          await supabase
            .from("inventory")
            .update({ current_stock: inventoryData.current_stock - item.quantity })
            .eq("product_id", item.id);
        }
      }

      toast.success(`Order #${orderNumber} completed! Total: ₱${total.toFixed(2)}`);
      setCartItems([]);
      fetchInventory(); // Refresh inventory after checkout
    } catch (error: any) {
      console.error("Error saving order:", error);
      toast.error("Failed to save order. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary">
                <Fuel className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Gas Refill Station
                </h1>
                <p className="text-muted-foreground mt-1">LPG Cylinder Sales & Refills</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden md:inline">{user?.email}</span>
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full font-medium">
                {role?.replace("_", " ").toUpperCase()}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex flex-wrap gap-2">{/* Navigation buttons remain below */}
            
              {hasAccess(["sales", "inventory", "finance", "admin", "super_admin"]) && (
                <Button
                  variant={showInventory ? "default" : "outline"}
                  onClick={() => {
                    setShowInventory(!showInventory);
                    setShowHistory(false);
                    setShowCustomers(false);
                    setShowSuppliers(false);
                    setShowExpenses(false);
                    setShowUsers(false);
                  }}
                  className="gap-2"
                >
                  <Package className="h-5 w-5" />
                  {showInventory ? "Back to POS" : "Inventory"}
                </Button>
              )}
              
              {hasAccess(["sales", "finance", "admin", "super_admin"]) && (
                <Button
                  variant={showHistory ? "default" : "outline"}
                  onClick={() => {
                    setShowHistory(!showHistory);
                    setShowInventory(false);
                    setShowCustomers(false);
                    setShowSuppliers(false);
                    setShowExpenses(false);
                    setShowUsers(false);
                  }}
                  className="gap-2"
                >
                  <Receipt className="h-5 w-5" />
                  {showHistory ? "Back" : "Order History"}
                </Button>
              )}
              
              {hasAccess(["sales", "admin", "super_admin"]) && (
                <Button
                  variant={showCustomers ? "default" : "outline"}
                  onClick={() => {
                    setShowCustomers(!showCustomers);
                    setShowInventory(false);
                    setShowHistory(false);
                    setShowSuppliers(false);
                    setShowExpenses(false);
                    setShowUsers(false);
                  }}
                  className="gap-2"
                >
                  <Users className="h-5 w-5" />
                  {showCustomers ? "Back" : "Customers"}
                </Button>
              )}
              
              {hasAccess(["inventory", "admin", "super_admin"]) && (
                <Button
                  variant={showSuppliers ? "default" : "outline"}
                  onClick={() => {
                    setShowSuppliers(!showSuppliers);
                    setShowInventory(false);
                    setShowHistory(false);
                    setShowCustomers(false);
                    setShowExpenses(false);
                    setShowUsers(false);
                  }}
                  className="gap-2"
                >
                  <Truck className="h-5 w-5" />
                  {showSuppliers ? "Back" : "Suppliers"}
                </Button>
              )}
              
              {hasAccess(["finance", "admin", "super_admin"]) && (
                <Button
                  variant={showExpenses ? "default" : "outline"}
                  onClick={() => {
                    setShowExpenses(!showExpenses);
                    setShowInventory(false);
                    setShowHistory(false);
                    setShowCustomers(false);
                    setShowSuppliers(false);
                    setShowUsers(false);
                  }}
                  className="gap-2"
                >
                  <FileText className="h-5 w-5" />
                  {showExpenses ? "Back" : "Expenses"}
                </Button>
              )}
              
              {hasAccess(["super_admin"]) && (
                <Button
                  variant={showUsers ? "default" : "outline"}
                  onClick={() => {
                    setShowUsers(!showUsers);
                    setShowInventory(false);
                    setShowHistory(false);
                    setShowCustomers(false);
                    setShowSuppliers(false);
                    setShowExpenses(false);
                  }}
                  className="gap-2"
                >
                  <Shield className="h-5 w-5" />
                  {showUsers ? "Back" : "Users"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {showUsers ? (
          <UserManagement />
        ) : showInventory ? (
          <InventoryManagement />
        ) : showHistory ? (
          <OrderHistory />
        ) : showCustomers ? (
          <CustomerManagement />
        ) : showSuppliers ? (
          <SupplierManagement />
        ) : showExpenses ? (
          <OperationsExpense />
        ) : hasAccess(["sales", "admin", "super_admin"]) ? (
          <div className="grid lg:grid-cols-[1fr_400px] gap-8">
            <div className="space-y-6">
              <CategoryFilter
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={handleAddToCart}
                    availableStock={inventory[product.id] || 0}
                  />
                ))}
              </div>
            </div>

            <div className="lg:sticky lg:top-8 h-fit">
              <Cart
                items={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onCheckout={handleCheckout}
              />
            </div>
          </div>
        ) : (
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Welcome!</h2>
            <p className="text-muted-foreground">
              Use the navigation buttons above to access your modules.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
