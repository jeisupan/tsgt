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
import { ProductManagement } from "@/components/ProductManagement";
import { Fuel, Receipt, Package, Users, Truck, FileText, LogOut, Shield, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAutoLogout } from "@/hooks/useAutoLogout";
import { UserManagement } from "@/components/UserManagement";
import gasCylinderLarge from "@/assets/gas-cylinder-large.jpg";
import gasCylinderMedium from "@/assets/gas-cylinder-medium.jpg";
import gasCylinderSmall from "@/assets/gas-cylinder-small.jpg";
import gasRegulator from "@/assets/gas-regulator.jpg";
import gasHose from "@/assets/gas-hose.jpg";
import deliveryService from "@/assets/delivery-service.jpg";
import refillService from "@/assets/refill-service.jpg";
import kanjiLogo from "@/assets/kanji-logo.png";

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
  const [activeMenu, setActiveMenu] = useState<string>("pos");
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  
  // Auto logout on inactivity (15 min) and tab/browser close
  useAutoLogout();

  const categories = Array.from(new Set(products.map((p) => p.category)));

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

  // Check if user has a role, if not show pending message
  if (!loading && !roleLoading && user && role === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Pending Approval</h2>
            <p className="text-gray-600 mb-4">
              Thank you for signing up! Your account has been created successfully.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-800">
                The administrator is already informed of your sign up. Please wait for the necessary access to be granted.
              </p>
            </div>
            <p className="text-sm text-gray-500">
              If you have any questions, please contact our support team.
            </p>
          </div>
          <Button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate("/auth");
            }}
            variant="outline"
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (user) {
      fetchInventory();
      fetchProducts();
      
      // Subscribe to real-time inventory updates
      const inventoryChannel = supabase
        .channel('inventory-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inventory'
          },
          () => {
            fetchInventory();
          }
        )
        .subscribe();

      // Subscribe to real-time product updates
      const productsChannel = supabase
        .channel('products-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'products'
          },
          () => {
            fetchProducts();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(inventoryChannel);
        supabase.removeChannel(productsChannel);
      };
    }
  }, [user]);

  const fetchInventory = async () => {
    const { data, error } = await supabase.from("inventory").select("product_id, current_stock");
    if (error) {
      return;
    }
    const inventoryMap: Record<string, number> = {};
    data.forEach((item) => {
      inventoryMap[item.product_id] = item.current_stock;
    });
    setInventory(inventoryMap);
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("category", { ascending: true });
    
    if (error) {
      return;
    }
    
    // Transform database products to match Product interface
    // Map asset paths to imported images
    const imageMap: Record<string, string> = {
      '/src/assets/gas-cylinder-large.jpg': gasCylinderLarge,
      '/src/assets/gas-cylinder-medium.jpg': gasCylinderMedium,
      '/src/assets/gas-cylinder-small.jpg': gasCylinderSmall,
      '/src/assets/gas-regulator.jpg': gasRegulator,
      '/src/assets/gas-hose.jpg': gasHose,
      '/src/assets/delivery-service.jpg': deliveryService,
      '/src/assets/refill-service.jpg': refillService,
    };
    
    const transformedProducts: Product[] = data.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      category: p.category,
      image: p.image_url ? (imageMap[p.image_url] || p.image_url) : "",
    }));
    
    setProducts(transformedProducts);
  };

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category === selectedCategory);

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

  const handleCheckout = async (customerId: string, invoiceNumber?: string) => {
    // Calculate totals - prices already include 12% VAT
    const total = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const subtotal = total / 1.12; // Price without VAT (VAT is already included)
    const tax = total - subtotal; // 12% VAT amount

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
        product_category: products.find((p) => p.id === item.id)?.category || "Unknown",
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
      toast.error("Failed to save order. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white shadow-sm">
                <img src={kanjiLogo} alt="Kanji AI Apps" className="h-12 w-12" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Business Management System
                </h1>
                <p className="text-muted-foreground mt-1">Manage sales, inventory, and expenses in one place.</p>
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
            <div className="flex flex-wrap gap-2">
              {hasAccess(["sales", "admin", "super_admin"]) && (
                <Button
                  variant={activeMenu === "pos" ? "default" : "outline"}
                  onClick={() => setActiveMenu("pos")}
                  className="gap-2"
                >
                  <Fuel className="h-5 w-5" />
                  POS
                </Button>
              )}
            
              {hasAccess(["sales", "inventory", "finance", "admin", "super_admin"]) && (
                <Button
                  variant={activeMenu === "inventory" ? "default" : "outline"}
                  onClick={() => setActiveMenu("inventory")}
                  className="gap-2"
                >
                  <Package className="h-5 w-5" />
                  Inventory
                </Button>
              )}
              
              {hasAccess(["sales", "finance", "admin", "super_admin"]) && (
                <Button
                  variant={activeMenu === "history" ? "default" : "outline"}
                  onClick={() => setActiveMenu("history")}
                  className="gap-2"
                >
                  <Receipt className="h-5 w-5" />
                  Order History
                </Button>
              )}
              
              {hasAccess(["sales", "admin", "super_admin"]) && (
                <Button
                  variant={activeMenu === "customers" ? "default" : "outline"}
                  onClick={() => setActiveMenu("customers")}
                  className="gap-2"
                >
                  <Users className="h-5 w-5" />
                  Customers
                </Button>
              )}
              
              {hasAccess(["inventory", "admin", "super_admin"]) && (
                <Button
                  variant={activeMenu === "suppliers" ? "default" : "outline"}
                  onClick={() => setActiveMenu("suppliers")}
                  className="gap-2"
                >
                  <Truck className="h-5 w-5" />
                  Suppliers
                </Button>
              )}
              
              {hasAccess(["finance", "admin", "super_admin"]) && (
                <Button
                  variant={activeMenu === "expenses" ? "default" : "outline"}
                  onClick={() => setActiveMenu("expenses")}
                  className="gap-2"
                >
                  <FileText className="h-5 w-5" />
                  Expenses
                </Button>
              )}
              
              {hasAccess(["sales", "admin", "super_admin"]) && (
                <Button
                  variant={activeMenu === "products" ? "default" : "outline"}
                  onClick={() => setActiveMenu("products")}
                  className="gap-2"
                >
                  <ShoppingBag className="h-5 w-5" />
                  POS Items
                </Button>
              )}
              
              {hasAccess(["super_admin"]) && (
                <Button
                  variant={activeMenu === "users" ? "default" : "outline"}
                  onClick={() => setActiveMenu("users")}
                  className="gap-2"
                >
                  <Shield className="h-5 w-5" />
                  Users
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {activeMenu === "users" ? (
          <UserManagement />
        ) : activeMenu === "products" ? (
          <ProductManagement />
        ) : activeMenu === "inventory" ? (
          <InventoryManagement />
        ) : activeMenu === "history" ? (
          <OrderHistory />
        ) : activeMenu === "customers" ? (
          <CustomerManagement />
        ) : activeMenu === "suppliers" ? (
          <SupplierManagement />
        ) : activeMenu === "expenses" ? (
          <OperationsExpense />
        ) : activeMenu === "pos" && hasAccess(["sales", "admin", "super_admin"]) ? (
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
