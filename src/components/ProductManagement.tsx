import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductDialog } from "./ProductDialog";
import { Plus, Pencil, Trash2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
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

    const channel = supabase
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
      supabase.removeChannel(channel);
    };
  }, []);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleAdd = () => {
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
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="relative group">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <button
                    onClick={() => handleEdit(product)}
                    className="absolute bottom-2 right-2 p-2 bg-background/90 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
                    title="Edit product image"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{product.category}</p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold">₱{product.price.toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground">
                      Stock: {product.current_stock ?? 0}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
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
                </CardContent>
              </Card>
            ))}
          </div>
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
