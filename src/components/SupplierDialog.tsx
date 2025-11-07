import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
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
  const [editedFields, setEditedFields] = useState<Set<string>>(new Set());

  // Inventory can edit suppliers but sensitive fields are masked initially when editing existing
  const canViewSensitiveData = role === "admin" || role === "super_admin" || role === "finance" || (!editingSupplier && role === "inventory");
  const showMaskedTooltip = editingSupplier && role === "inventory";

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
      setEditedFields(new Set());
    } else {
      setFormData({ name: "", email: "", phone: "", address: "", tin_number: "" });
      setEditedFields(new Set());
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
        // For inventory role, only update fields that were actually edited
        const updateData: any = { name: formData.name, account_id: accountId };
        
        if (showMaskedTooltip) {
          // Only include sensitive fields if they were edited
          if (editedFields.has('tin_number')) updateData.tin_number = formData.tin_number;
          if (editedFields.has('email')) updateData.email = formData.email;
          if (editedFields.has('phone')) updateData.phone = formData.phone;
          if (editedFields.has('address')) updateData.address = formData.address;
        } else {
          // Admin/finance/super_admin can update all fields
          Object.assign(updateData, formData);
        }
        
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
      setEditedFields(new Set());
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
          {showMaskedTooltip && (
            <div className="flex items-start gap-2 p-3 bg-muted rounded-md text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>Sensitive fields show masked values for privacy. You can edit them by typing new values.</p>
            </div>
          )}
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
          <TooltipProvider>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="tin_number">TIN Number</Label>
                {showMaskedTooltip && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Initially masked for privacy. Clear and type to update.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <Input
                id="tin_number"
                value={canViewSensitiveData || !editingSupplier ? formData.tin_number : maskTin(formData.tin_number)}
                onChange={(e) => {
                  setFormData({ ...formData, tin_number: e.target.value });
                  setEditedFields(new Set(editedFields).add('tin_number'));
                }}
                onFocus={(e) => {
                  if (showMaskedTooltip && !editedFields.has('tin_number')) {
                    e.target.value = '';
                  }
                }}
                placeholder="Enter TIN number"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="email">Email</Label>
                {showMaskedTooltip && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Initially masked for privacy. Clear and type to update.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <Input
                id="email"
                type="email"
                value={canViewSensitiveData || !editingSupplier ? formData.email : maskEmail(formData.email)}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setEditedFields(new Set(editedFields).add('email'));
                }}
                onFocus={(e) => {
                  if (showMaskedTooltip && !editedFields.has('email')) {
                    e.target.value = '';
                  }
                }}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="phone">Phone</Label>
                {showMaskedTooltip && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Initially masked for privacy. Clear and type to update.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <Input
                id="phone"
                value={canViewSensitiveData || !editingSupplier ? formData.phone : maskPhone(formData.phone)}
                onChange={(e) => {
                  setFormData({ ...formData, phone: e.target.value });
                  setEditedFields(new Set(editedFields).add('phone'));
                }}
                onFocus={(e) => {
                  if (showMaskedTooltip && !editedFields.has('phone')) {
                    e.target.value = '';
                  }
                }}
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="address">Address</Label>
                {showMaskedTooltip && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Initially masked for privacy. Clear and type to update.</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <Textarea
                id="address"
                value={canViewSensitiveData || !editingSupplier ? formData.address : maskAddress(formData.address)}
                onChange={(e) => {
                  setFormData({ ...formData, address: e.target.value });
                  setEditedFields(new Set(editedFields).add('address'));
                }}
                onFocus={(e) => {
                  if (showMaskedTooltip && !editedFields.has('address')) {
                    e.target.value = '';
                  }
                }}
                placeholder="Enter address"
                rows={3}
              />
            </div>
          </TooltipProvider>
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
