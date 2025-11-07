import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface CategoryManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoriesUpdate: () => void;
}

export const CategoryManagementDialog = ({ 
  open, 
  onOpenChange,
  onCategoriesUpdate 
}: CategoryManagementDialogProps) => {
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [editingCategory, setEditingCategory] = useState<{ id: string; old: string; new: string } | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const { accountId } = useUserRole();

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("id, name")
      .order("name");
    
    if (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to load categories");
      return;
    }
    
    if (data) {
      setCategories(data);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    if (categories.some(c => c.name === newCategory.trim())) {
      toast.error("Category already exists");
      return;
    }

    if (!accountId) {
      toast.error("Account information not available");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("categories")
        .insert({
          name: newCategory.trim(),
          account_id: accountId,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      await fetchCategories();
      setNewCategory("");
      toast.success("Category added successfully");
      onCategoriesUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to add category");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = async (categoryId: string, oldName: string, newName: string) => {
    if (!newName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    if (oldName === newName.trim()) {
      setEditingCategory(null);
      return;
    }

    setLoading(true);
    try {
      // Update category in categories table
      const { error: categoryError } = await supabase
        .from("categories")
        .update({ name: newName.trim() })
        .eq("id", categoryId);

      if (categoryError) throw categoryError;

      // Also update products using this category
      const { error: productsError } = await supabase
        .from("products")
        .update({ category: newName.trim() })
        .eq("category", oldName);

      if (productsError) console.error("Error updating products:", productsError);

      toast.success("Category updated successfully");
      await fetchCategories();
      setEditingCategory(null);
      onCategoriesUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to update category");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    const { data: productsWithCategory } = await supabase
      .from("products")
      .select("id")
      .eq("category", categoryName);

    if (productsWithCategory && productsWithCategory.length > 0) {
      toast.error(`Cannot delete category. ${productsWithCategory.length} product(s) are using it.`);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", categoryId);

      if (error) throw error;

      await fetchCategories();
      toast.success("Category deleted successfully");
      onCategoriesUpdate();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Categories</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Add New Category</Label>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter category name"
                onKeyPress={(e) => e.key === "Enter" && handleAddCategory()}
              />
              <Button onClick={handleAddCategory} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Existing Categories</Label>
            <div className="border rounded-md max-h-[300px] overflow-y-auto">
              {categories.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No categories yet
                </div>
              ) : (
                <div className="divide-y">
                  {categories.map((category) => (
                    <div key={category.id} className="p-3 flex items-center justify-between gap-2">
                      {editingCategory?.id === category.id ? (
                        <div className="flex-1 flex gap-2">
                          <Input
                            value={editingCategory.new}
                            onChange={(e) => setEditingCategory({ id: category.id, old: category.name, new: e.target.value })}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                handleEditCategory(category.id, category.name, editingCategory.new);
                              }
                            }}
                            className="h-8"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleEditCategory(category.id, category.name, editingCategory.new)}
                            disabled={loading}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingCategory(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="flex-1">{category.name}</span>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingCategory({ id: category.id, old: category.name, new: category.name })}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                              className="h-8 w-8 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
