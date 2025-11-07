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
  first_name: z.string().trim().min(1, "First name is required").max(50, "First name must be less than 50 characters"),
  last_name: z.string().trim().min(1, "Last name is required").max(50, "Last name must be less than 50 characters"),
  email: z.string().email("Invalid email address").max(255, "Email must be less than 255 characters").optional().or(z.literal('')),
  phone: z.string().regex(/^[0-9\-\+\(\)\s]*$/, "Phone must contain only numbers and standard formatting characters").max(20, "Phone must be less than 20 characters").optional().or(z.literal('')),
  address: z.string().max(500, "Address must be less than 500 characters").optional().or(z.literal(''))
});

interface Customer {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
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
    first_name: "",
    last_name: "",
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
      // Try to get first_name and last_name, fallback to splitting name
      let firstName = editingCustomer.first_name || "";
      let lastName = editingCustomer.last_name || "";
      
      if (!firstName && !lastName && editingCustomer.name) {
        // Split existing name into first and last
        const nameParts = editingCustomer.name.trim().split(/\s+/);
        firstName = nameParts[0] || "";
        lastName = nameParts.slice(1).join(" ") || "";
      }
      
      setFormData({
        first_name: firstName,
        last_name: lastName,
        // Sales role cannot see sensitive data when editing
        email: showSensitiveData ? (editingCustomer.email || "") : "",
        phone: showSensitiveData ? (editingCustomer.phone || "") : "",
        address: showSensitiveData ? (editingCustomer.address || "") : "",
      });
    } else {
      setFormData({ first_name: "", last_name: "", email: "", phone: "", address: "" });
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
      // Compute full_name from first_name and last_name
      const full_name = `${formData.first_name.trim()} ${formData.last_name.trim()}`.trim();
      const dataToSave = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        full_name,
        name: full_name, // Keep name for backward compatibility
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
      };
      
      // Check for duplicates (only when creating new customer)
      if (!editingCustomer) {
        let duplicateCustomer: Customer | null = null;
        let duplicateField = "";
        
        // Check for duplicate name
        const { data: nameData } = await supabase
          .from("customers")
          .select("*")
          .eq("is_active", true)
          .or(`name.ilike.${full_name},full_name.ilike.${full_name}`)
          .limit(1)
          .maybeSingle();
        
        if (nameData) {
          duplicateCustomer = nameData;
          duplicateField = "name";
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
            ...dataToSave,
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
          .insert([{ ...dataToSave, is_active: true }]);

        if (error) throw error;
        toast.success("Customer added successfully");
      }

      setFormData({ first_name: "", last_name: "", email: "", phone: "", address: "" });
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Enter first name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Enter last name"
                required
              />
            </div>
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
