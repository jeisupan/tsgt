import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/useUserRole";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { z } from "zod";

const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal('')),
  phone: z.string().regex(/^[0-9\-\+\(\)\s]*$/, "Phone must contain only numbers and standard formatting characters").max(20, "Phone must be less than 20 characters").optional().or(z.literal('')),
  address: z.string().max(500, "Address must be less than 500 characters").optional().or(z.literal(''))
});

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active?: boolean;
}

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerAdded: () => void;
  editingCustomer?: Customer | null;
  onDuplicateFound?: (customer: Customer) => void;
}

export const CustomerDialog = ({ open, onOpenChange, onCustomerAdded, editingCustomer, onDuplicateFound }: CustomerDialogProps) => {
  const { role } = useUserRole();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSalesRole = role === "sales";
  const showSensitiveData = role === "admin" || role === "super_admin";

  // Update form when editing customer changes
  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name,
        // Sales role cannot see sensitive data when editing
        email: showSensitiveData ? (editingCustomer.email || "") : "",
        phone: showSensitiveData ? (editingCustomer.phone || "") : "",
        address: showSensitiveData ? (editingCustomer.address || "") : "",
      });
    } else {
      setFormData({ name: "", email: "", phone: "", address: "" });
    }
  }, [editingCustomer, showSensitiveData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data with zod
    const validation = customerSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setIsSubmitting(true);

    try {
      // Check for duplicates (only when creating new customer)
      if (!editingCustomer) {
        let duplicateCustomer: Customer | null = null;
        let duplicateField = "";
        
        // Check for duplicate name
        if (formData.name.trim()) {
          const { data } = await supabase
            .from("customers")
            .select("*")
            .eq("is_active", true)
            .ilike("name", formData.name.trim())
            .limit(1)
            .maybeSingle();
          
          if (data) {
            duplicateCustomer = data;
            duplicateField = "name";
          }
        }
        
        // Check for duplicate email
        if (!duplicateCustomer && formData.email.trim()) {
          const { data } = await supabase
            .from("customers")
            .select("*")
            .eq("is_active", true)
            .ilike("email", formData.email.trim())
            .limit(1)
            .maybeSingle();
          
          if (data) {
            duplicateCustomer = data;
            duplicateField = "email";
          }
        }
        
        // Check for duplicate phone
        if (!duplicateCustomer && formData.phone.trim()) {
          const { data } = await supabase
            .from("customers")
            .select("*")
            .eq("is_active", true)
            .eq("phone", formData.phone.trim())
            .limit(1)
            .maybeSingle();
          
          if (data) {
            duplicateCustomer = data;
            duplicateField = "phone";
          }
        }

        if (duplicateCustomer && duplicateField) {
          setIsSubmitting(false);
          
          toast.error(`A customer with this ${duplicateField} already exists`, {
            description: "Click 'Edit Customer' to load the existing record for editing",
            action: {
              label: "Edit Customer",
              onClick: () => {
                if (onDuplicateFound) {
                  onDuplicateFound(duplicateCustomer);
                }
              }
            },
            duration: 5000,
          });
          return;
        }
      }

      if (editingCustomer) {
        // Implement Change Data Capture (CDC)
        // Mark old record as inactive
        const { error: deactivateError } = await supabase
          .from("customers")
          .update({ is_active: false })
          .eq("id", editingCustomer.id);

        if (deactivateError) throw deactivateError;

        // Insert new record with updated data
        const { data: newCustomer, error: insertError } = await supabase
          .from("customers")
          .insert({
            ...formData,
            is_active: true,
            previous_version: editingCustomer.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        // Update the old record to point to the new one
        const { error: updateError } = await supabase
          .from("customers")
          .update({ replaced_by: newCustomer.id })
          .eq("id", editingCustomer.id);

        if (updateError) throw updateError;

        toast.success("Customer updated successfully (previous version preserved)");
      } else {
        // Create new customer
        const { error } = await supabase
          .from("customers")
          .insert([{ ...formData, is_active: true }]);

        if (error) throw error;
        toast.success("Customer added successfully");
      }

      setFormData({ name: "", email: "", phone: "", address: "" });
      onCustomerAdded();
      onOpenChange(false);
    } catch (error) {
      toast.error(`Failed to ${editingCustomer ? "update" : "add"} customer`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingCustomer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
          {editingCustomer && (
            <DialogDescription>
              Changes will create a new version while preserving history
            </DialogDescription>
          )}
        </DialogHeader>

        {isSalesRole && editingCustomer && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Sensitive customer information is hidden for your role. Contact your admin if you need to update details.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter customer name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={isSalesRole && !!editingCustomer ? "Hidden for security" : "Enter email address"}
              disabled={isSalesRole && !!editingCustomer}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={isSalesRole && !!editingCustomer ? "Hidden for security" : "Enter phone number"}
              disabled={isSalesRole && !!editingCustomer}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder={isSalesRole && !!editingCustomer ? "Hidden for security" : "Enter address"}
              rows={3}
              disabled={isSalesRole && !!editingCustomer}
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
                ? (editingCustomer ? "Updating..." : "Adding...") 
                : (editingCustomer ? "Update Customer" : "Add Customer")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
