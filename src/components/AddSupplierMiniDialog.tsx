import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  phone: z.string().trim().min(1, "Phone number is required").max(20, "Phone number must be less than 20 characters"),
  tin_number: z.string().trim().min(1, "TIN number is required").max(50, "TIN must be less than 50 characters"),
  address: z.string().trim().max(500, "Address must be less than 500 characters").optional(),
});

interface AddSupplierMiniDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSupplierAdded: (supplierId: string, supplierName: string) => void;
}

interface DuplicateSupplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  tin_number: string | null;
}

export const AddSupplierMiniDialog = ({ 
  open, 
  onOpenChange, 
  onSupplierAdded 
}: AddSupplierMiniDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    tin_number: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateSupplier, setDuplicateSupplier] = useState<DuplicateSupplier | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = supplierSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setIsSubmitting(true);
    setDuplicateSupplier(null);

    try {
      // Check for duplicates
      const { data: existingSuppliers, error: searchError } = await supabase
        .from("suppliers")
        .select("id, name, email, phone, tin_number")
        .or(`name.eq.${formData.name},email.eq.${formData.email},phone.eq.${formData.phone},tin_number.eq.${formData.tin_number}`);

      if (searchError) throw searchError;

      if (existingSuppliers && existingSuppliers.length > 0) {
        // Found duplicate
        setDuplicateSupplier(existingSuppliers[0]);
        setIsSubmitting(false);
        return;
      }

      // No duplicates, proceed with insert
      const { data, error } = await supabase
        .from("suppliers")
        .insert([{
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          tin_number: formData.tin_number,
          address: formData.address || null,
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success("Supplier added successfully");
      onSupplierAdded(data.id, data.name);
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        tin_number: "",
        address: "",
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding supplier:", error);
      toast.error("Failed to add supplier");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewExisting = () => {
    // Close this dialog and navigate to supplier management
    // You can implement navigation logic here if needed
    toast.info(`Existing supplier: ${duplicateSupplier?.name}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Supplier</DialogTitle>
        </DialogHeader>
        
        {duplicateSupplier && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              A supplier with this record already exists.{" "}
              <button 
                onClick={handleViewExisting}
                className="underline font-medium hover:no-underline"
              >
                View Existing Supplier Info
              </button>
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
              placeholder="Enter supplier name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="supplier@example.com"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="09XX XXX XXXX"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tin_number">TIN Number *</Label>
              <Input
                id="tin_number"
                value={formData.tin_number}
                onChange={(e) => setFormData({ ...formData, tin_number: e.target.value })}
                placeholder="XXX-XXX-XXX"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address (Optional)</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter address"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Supplier"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};