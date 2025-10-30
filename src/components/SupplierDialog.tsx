import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tin_number: string | null;
}

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierAdded: () => void;
  editingSupplier?: Supplier | null;
}

export const SupplierDialog = ({ open, onOpenChange, onSupplierAdded, editingSupplier }: SupplierDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    tin_number: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when editing supplier changes
  useEffect(() => {
    if (editingSupplier) {
      setFormData({
        name: editingSupplier.name,
        email: editingSupplier.email || "",
        phone: editingSupplier.phone || "",
        address: editingSupplier.address || "",
        tin_number: editingSupplier.tin_number || "",
      });
    } else {
      setFormData({ name: "", email: "", phone: "", address: "", tin_number: "" });
    }
  }, [editingSupplier]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Supplier name is required");
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingSupplier) {
        // Update existing supplier
        const { error } = await supabase
          .from("suppliers")
          .update(formData)
          .eq("id", editingSupplier.id);

        if (error) throw error;
        toast.success("Supplier updated successfully");
      } else {
        // Create new supplier
        const { error } = await supabase.from("suppliers").insert([formData]);

        if (error) throw error;
        toast.success("Supplier added successfully");
      }

      setFormData({ name: "", email: "", phone: "", address: "", tin_number: "" });
      onSupplierAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error(`Failed to ${editingSupplier ? "update" : "add"} supplier`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter supplier name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tin_number">TIN Number</Label>
            <Input
              id="tin_number"
              value={formData.tin_number}
              onChange={(e) => setFormData({ ...formData, tin_number: e.target.value })}
              placeholder="Enter TIN number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter address"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
                ? (editingSupplier ? "Updating..." : "Adding...") 
                : (editingSupplier ? "Update Supplier" : "Add Supplier")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
