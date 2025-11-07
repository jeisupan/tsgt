import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { useUserRole } from "@/hooks/useUserRole";
import { maskEmail, maskPhone, maskAddress, maskTin } from "@/lib/utils";

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal('')),
  phone: z.string().regex(/^[0-9\-\+\(\)\s]*$/, "Phone must contain only numbers and standard formatting characters").max(20, "Phone must be less than 20 characters").optional().or(z.literal('')),
  address: z.string().max(500, "Address must be less than 500 characters").optional().or(z.literal('')),
  tin_number: z.string().max(50, "TIN must be less than 50 characters").optional().or(z.literal(''))
});

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
  const { role, accountId } = useUserRole();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    tin_number: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inventory can edit suppliers but sensitive fields are masked when editing existing
  const canViewSensitiveData = role === "admin" || role === "super_admin" || role === "finance" || (!editingSupplier && role === "inventory");
  const isSensitiveFieldReadOnly = editingSupplier && role === "inventory";

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
    
    // Validate form data with zod
    const validation = supplierSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setIsSubmitting(true);

    try {
      if (editingSupplier) {
        // Update existing supplier
        // For inventory role, only update the name field
        const updateData = isSensitiveFieldReadOnly
          ? { name: formData.name, account_id: accountId }
          : { ...formData, account_id: accountId };
          
        const { error } = await supabase
          .from("suppliers")
          .update(updateData)
          .eq("id", editingSupplier.id);

        if (error) throw error;
        toast.success("Supplier updated successfully");
      } else {
        // Create new supplier
        const { error } = await supabase.from("suppliers").insert([{ ...formData, account_id: accountId }]);

        if (error) throw error;
        toast.success("Supplier added successfully");
      }

      setFormData({ name: "", email: "", phone: "", address: "", tin_number: "" });
      onSupplierAdded();
      onOpenChange(false);
    } catch (error) {
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
              value={canViewSensitiveData || !editingSupplier ? formData.tin_number : maskTin(formData.tin_number)}
              onChange={(e) => setFormData({ ...formData, tin_number: e.target.value })}
              placeholder="Enter TIN number"
              readOnly={isSensitiveFieldReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={canViewSensitiveData || !editingSupplier ? formData.email : maskEmail(formData.email)}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
              readOnly={isSensitiveFieldReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={canViewSensitiveData || !editingSupplier ? formData.phone : maskPhone(formData.phone)}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
              readOnly={isSensitiveFieldReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={canViewSensitiveData || !editingSupplier ? formData.address : maskAddress(formData.address)}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter address"
              rows={3}
              readOnly={isSensitiveFieldReadOnly}
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
