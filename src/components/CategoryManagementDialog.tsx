import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";

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
  const [categories, setCategories] = useState<string[]>([]);
  const [editingCategory, setEditingCategory] = useState<{ old: string; new: string } | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchCategories();
    }
  }, [open]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from("products")
      .select("category");
    
    if (data) {
      const uniqueCategories = [...new Set(data.map(p => p.category))].sort();
      setCategories(uniqueCategories);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    if (categories.includes(newCategory.trim())) {
      toast.error("Category already exists");
      return;
    }

    setCategories([...categories, newCategory.trim()].sort());
    setNewCategory("");
    toast.success("Category added (will be saved when used)");
  };

  const handleEditCategory = async (oldCategory: string, newCategoryName: string) => {
    if (!newCategoryName.trim()) {
      toast.error("Category name cannot be empty");
      return;
    }

    if (oldCategory === newCategoryName.trim()) {
      setEditingCategory(null);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("products")
        .update({ category: newCategoryName.trim() })
        .eq("category", oldCategory);

      if (error) throw error;

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

  const handleDeleteCategory = async (category: string) => {
    const { data: productsWithCategory } = await supabase
      .from("products")
      .select("id")
      .eq("category", category);

    if (productsWithCategory && productsWithCategory.length > 0) {
      toast.error(`Cannot delete category. ${productsWithCategory.length} product(s) are using it.`);
      return;
    }

    setCategories(categories.filter(c => c !== category));
    toast.success("Category removed");
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
                    <div key={category} className="p-3 flex items-center justify-between gap-2">
                      {editingCategory?.old === category ? (
                        <div className="flex-1 flex gap-2">
                          <Input
                            value={editingCategory.new}
                            onChange={(e) => setEditingCategory({ old: category, new: e.target.value })}
                            onKeyPress={(e) => {
                              if (e.key === "Enter") {
                                handleEditCategory(category, editingCategory.new);
                              }
                            }}
                            className="h-8"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            onClick={() => handleEditCategory(category, editingCategory.new)}
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
                          <span className="flex-1">{category}</span>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingCategory({ old: category, new: category })}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteCategory(category)}
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
