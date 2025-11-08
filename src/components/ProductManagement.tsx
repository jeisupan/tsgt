import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductDialog } from "./ProductDialog";
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string | null;
  current_stock?: number;
}

export const ProductManagement = () => {
  const { canAddProduct, getProductLimitMessage, tierLimits, refreshCounts } = useSubscription();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const fetchProducts = async () => {
    try {
      // Fetch products
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (productsError) throw productsError;

      // Fetch inventory
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory')
        .select('product_id, current_stock');

      if (inventoryError) throw inventoryError;

      // Create a map of product_id to current_stock
      const inventoryMap = new Map(
        inventoryData?.map(inv => [inv.product_id, inv.current_stock]) || []
      );

      // Merge products with inventory data
      const transformedData = productsData?.map(product => ({
        ...product,
        current_stock: inventoryMap.get(product.id) ?? 0
      })) || [];
      
      setProducts(transformedData);
    } catch (error: any) {
      toast.error("Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    // Subscribe to product changes
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

    // Subscribe to inventory changes
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
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(inventoryChannel);
    };
  }, []);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    if (!canAddProduct) {
      toast.error(`Free tier allows maximum ${tierLimits.maxProducts} products. Upgrade to add more.`);
      return;
    }
    setSelectedProduct(null);
    setDialogOpen(true);
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      // Delete image from storage if it exists and is not from assets
      if (productToDelete.image_url && !productToDelete.image_url.includes('/assets/')) {
        const fileName = productToDelete.image_url.split('/').pop();
        if (fileName) {
          await supabase.storage.from('product-images').remove([fileName]);
        }
      }

      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) throw error;

      toast.success("Product deleted successfully");
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      // Force immediate refresh
      await fetchProducts();
      refreshCounts();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete product");
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Product Management</CardTitle>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{getProductLimitMessage()}</span>
            <Button onClick={handleAdd} disabled={!canAddProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!canAddProduct && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Free tier allows maximum {tierLimits.maxProducts} products. Upgrade to Growth or Professional tier to add more products.
              </AlertDescription>
            </Alert>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>₱{product.price.toFixed(2)}</TableCell>
                  <TableCell>{product.current_stock ?? 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(product)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(product)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
        onSuccess={fetchProducts}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{productToDelete?.name}". This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
