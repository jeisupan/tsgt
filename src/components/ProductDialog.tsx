import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { CategoryManagementDialog } from "./CategoryManagementDialog";
import { Settings } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";

const productSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Product name is required")
    .max(200, "Product name must be less than 200 characters"),
  price: z.number()
    .positive("Price must be greater than 0")
    .max(999999.99, "Price must be less than 1,000,000"),
  category: z.string()
    .trim()
    .min(1, "Category is required")
    .max(100, "Category must be less than 100 characters"),
});

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string | null;
}

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  onSuccess: () => void;
}

export const ProductDialog = ({ open, onOpenChange, product, onSuccess }: ProductDialogProps) => {
  const { canAddProduct, tierLimits, refreshCounts } = useSubscription();
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [isCategoryManagementOpen, setIsCategoryManagementOpen] = useState(false);
  const { accountId } = useUserRole();

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
    
    if (product) {
      setFormData({
        name: product.name,
        price: product.price.toString(),
        category: product.category,
      });
    } else {
      setFormData({
        name: "",
        price: "",
        category: "",
      });
      setImageFile(null);
    }
  }, [product, open]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("name")
      .order("name");
    
    if (error) {
      console.error("Error fetching categories:", error);
      return;
    }
    
    if (data) {
      const categoryNames = data.map(c => c.name);
      setCategories(categoryNames);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check product limit for new products
    if (!product && !canAddProduct) {
      toast.error(`Free tier allows maximum ${tierLimits.maxProducts} products. Upgrade to add more.`);
      return;
    }

    // Validate image file if provided
    if (imageFile) {
      if (!ALLOWED_IMAGE_TYPES.includes(imageFile.type)) {
        toast.error("Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.");
        return;
      }
      if (imageFile.size > MAX_IMAGE_SIZE) {
        toast.error("Image size must be less than 5MB");
        return;
      }
    }

    // Validate form data with Zod
    const validation = productSchema.safeParse({
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setLoading(true);

    try {
      let imageUrl = product?.image_url || null;

      // Upload image if a new file is selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `product-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;

        // Delete old image if updating
        if (product?.image_url && !product.image_url.includes('/assets/')) {
          const oldFileName = product.image_url.split('/').pop();
          if (oldFileName) {
            await supabase.storage.from('product-images').remove([oldFileName]);
          }
        }
      }

      const productData = {
        name: formData.name,
        price: parseFloat(formData.price),
        category: formData.category,
        image_url: imageUrl,
      };

      if (product) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', product.id);

        if (error) throw error;
        toast.success("Product updated successfully");
      } else {
        if (!accountId) {
          toast.error("Account information not available");
          return;
        }

        const { error } = await supabase
          .from('products')
          .insert({
            ...productData,
            account_id: accountId
          });

        if (error) throw error;
        toast.success("Product added successfully");
      }

      // Force immediate multiple refreshes to ensure visibility
      onSuccess();
      refreshCounts();
      
      // Stagger refreshes to catch DB propagation
      setTimeout(() => onSuccess(), 50);
      setTimeout(() => onSuccess(), 150);
      setTimeout(() => onSuccess(), 300);
      
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="category">Category</Label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsCategoryManagementOpen(true)}
                className="h-6 w-6"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-popover border z-50">
                {categories.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    No categories yet. Click the settings icon to add one.
                  </div>
                ) : (
                  categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="image">Image</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('image')?.click()}
                className="w-full"
              >
                {imageFile ? imageFile.name : "Choose File"}
              </Button>
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>
            {product?.image_url && !imageFile && (
              <p className="text-sm text-muted-foreground">Current image will be kept if no new file is selected</p>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>

      <CategoryManagementDialog
        open={isCategoryManagementOpen}
        onOpenChange={setIsCategoryManagementOpen}
        onCategoriesUpdate={fetchCategories}
      />
    </Dialog>
  );
};
