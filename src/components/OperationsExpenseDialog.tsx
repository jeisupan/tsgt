import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { AddSupplierMiniDialog } from "@/components/AddSupplierMiniDialog";

const expenseSchema = z.object({
  voucher_number: z.string().trim().min(1, "Voucher number is required").max(50, "Voucher number must be less than 50 characters"),
  voucher_type: z.string().min(1, "Voucher type is required"),
  branch: z.string().trim().min(1, "Branch is required").max(100, "Branch must be less than 100 characters"),
  plate_number: z.string().max(20, "Plate number must be less than 20 characters").optional(),
  remarks: z.string().max(500, "Remarks must be less than 500 characters").optional(),
  encoder: z.string(),
  date: z.string(),
});

const particularSchema = z.object({
  particular_name: z.string().trim().min(1, "Particular name is required").max(500, "Name must be less than 500 characters"),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 10000000;
  }, "Amount must be a positive number"),
  category: z.string().optional(),
  supplier_id: z.string().min(1, "Supplier is required"),
});

interface Particular {
  id?: string;
  particular_name: string;
  amount: string;
  category: string;
  supplier_id: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface OperationsExpense {
  id: string;
  voucher_number: string;
  voucher_type: string;
  date: string;
  branch: string;
  encoder: string;
  particulars: string;
  category: string;
  plate_number: string | null;
  amount: number;
  remarks: string | null;
  supplier_id: string | null;
}

interface OperationsExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpenseAdded: () => void;
  editingExpense?: OperationsExpense | null;
}

export const OperationsExpenseDialog = ({ 
  open, 
  onOpenChange, 
  onExpenseAdded, 
  editingExpense 
}: OperationsExpenseDialogProps) => {
  const [formData, setFormData] = useState({
    voucher_number: "",
    voucher_type: "",
    date: new Date().toISOString().split("T")[0],
    branch: "",
    encoder: "Current User",
    plate_number: "",
    remarks: "",
  });
  const [particulars, setParticulars] = useState<Particular[]>([
    { particular_name: "", amount: "", category: "", supplier_id: "" }
  ]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      setIsLoadingSuppliers(true);
      try {
        const { data, error } = await supabase
          .from("suppliers")
          .select("id, name")
          .order("name");

        if (error) throw error;
        setSuppliers(data || []);
      } catch (error) {
        console.error("Error fetching suppliers:", error);
        toast.error("Failed to load suppliers");
      } finally {
        setIsLoadingSuppliers(false);
      }
    };

    if (open) {
      fetchSuppliers();
    }
  }, [open]);

  // Update form when editing expense changes
  useEffect(() => {
    if (editingExpense) {
      setFormData({
        voucher_number: editingExpense.voucher_number,
        voucher_type: editingExpense.voucher_type,
        date: editingExpense.date,
        branch: editingExpense.branch,
        encoder: editingExpense.encoder,
        plate_number: editingExpense.plate_number || "",
        remarks: editingExpense.remarks || "",
      });
      
      // Load existing particulars if editing
      const loadParticulars = async () => {
        const { data, error } = await supabase
          .from("expense_particulars")
          .select("*")
          .eq("expense_id", editingExpense.id);
        
        if (!error && data && data.length > 0) {
          setParticulars(data.map(p => ({
            id: p.id,
            particular_name: p.particular_name,
            amount: p.amount.toString(),
            category: p.category || "",
            supplier_id: p.supplier_id || "",
          })));
        } else {
          // Fallback to old single particular format
          setParticulars([{
            particular_name: editingExpense.particulars,
            amount: editingExpense.amount.toString(),
            category: editingExpense.category,
            supplier_id: editingExpense.supplier_id || "",
          }]);
        }
      };
      
      loadParticulars();
    } else {
      setFormData({
        voucher_number: "",
        voucher_type: "",
        date: new Date().toISOString().split("T")[0],
        branch: "",
        encoder: "Current User",
        plate_number: "",
        remarks: "",
      });
      setParticulars([{ particular_name: "", amount: "", category: "", supplier_id: "" }]);
    }
  }, [editingExpense]);

  const addParticular = () => {
    setParticulars([...particulars, { particular_name: "", amount: "", category: "", supplier_id: "" }]);
  };

  const removeParticular = (index: number) => {
    if (particulars.length > 1) {
      setParticulars(particulars.filter((_, i) => i !== index));
    }
  };

  const updateParticular = (index: number, field: keyof Particular, value: string) => {
    const updated = [...particulars];
    updated[index] = { ...updated[index], [field]: value };
    setParticulars(updated);
  };

  const calculateTotal = () => {
    return particulars.reduce((sum, p) => {
      const amount = parseFloat(p.amount) || 0;
      return sum + amount;
    }, 0);
  };

  const handleSupplierAdded = (supplierId: string, supplierName: string) => {
    setSuppliers([...suppliers, { id: supplierId, name: supplierName }]);
    toast.success("Supplier added successfully");
  };

  const isFormValid = () => {
    const hasValidFormData = formData.voucher_number && formData.voucher_type && 
                             formData.branch;
    const hasValidParticulars = particulars.length > 0 && 
                                particulars.every(p => p.particular_name && p.amount && p.supplier_id);
    return hasValidFormData && hasValidParticulars;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    const validation = expenseSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    // Validate all particulars
    for (let i = 0; i < particulars.length; i++) {
      const pValidation = particularSchema.safeParse(particulars[i]);
      if (!pValidation.success) {
        const firstError = pValidation.error.errors[0];
        toast.error(`Particular ${i + 1}: ${firstError.message}`);
        return;
      }
    }

    const totalAmount = calculateTotal();
    if (totalAmount <= 0) {
      toast.error("Total amount must be greater than 0");
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        voucher_number: formData.voucher_number,
        voucher_type: formData.voucher_type,
        date: formData.date,
        branch: formData.branch,
        encoder: formData.encoder,
        plate_number: formData.plate_number || null,
        remarks: formData.remarks || null,
        supplier_id: particulars[0].supplier_id,
        amount: totalAmount,
        // Keep old format for backward compatibility
        particulars: particulars[0].particular_name,
        category: particulars[0].category || "other",
      };

      let expenseId: string;

      if (editingExpense) {
        // Update existing expense
        const { error } = await supabase
          .from("operations_expense")
          .update(submitData)
          .eq("id", editingExpense.id);

        if (error) throw error;
        expenseId = editingExpense.id;

        // Delete old particulars
        await supabase
          .from("expense_particulars")
          .delete()
          .eq("expense_id", expenseId);
      } else {
        // Create new expense
        const { data, error } = await supabase
          .from("operations_expense")
          .insert([submitData])
          .select()
          .single();

        if (error) throw error;
        expenseId = data.id;
      }

      // Insert all particulars
      const particularsData = particulars.map(p => ({
        expense_id: expenseId,
        particular_name: p.particular_name,
        amount: parseFloat(p.amount),
        category: p.category || null,
        supplier_id: p.supplier_id,
      }));

      const { error: particularsError } = await supabase
        .from("expense_particulars")
        .insert(particularsData);

      if (particularsError) throw particularsError;

      toast.success(`Expense ${editingExpense ? "updated" : "added"} successfully`);
      onExpenseAdded();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting expense:", error);
      toast.error(`Failed to ${editingExpense ? "update" : "add"} expense`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingExpense ? "Edit Operations Expense" : "Add Operations Expense"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Voucher Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="voucher_number">Voucher Number *</Label>
                <Input
                  id="voucher_number"
                  value={formData.voucher_number}
                  onChange={(e) => setFormData({ ...formData, voucher_number: e.target.value })}
                  placeholder="Enter voucher number"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voucher_type">Voucher Type *</Label>
                <Select
                  value={formData.voucher_type}
                  onValueChange={(value) => setFormData({ ...formData, voucher_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="reimbursement">Reimbursement</SelectItem>
                    <SelectItem value="petty_cash">Petty Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch *</Label>
                <Input
                  id="branch"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                  placeholder="Enter branch"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="encoder">Encoder</Label>
                <Input
                  id="encoder"
                  value={formData.encoder}
                  onChange={(e) => setFormData({ ...formData, encoder: e.target.value })}
                  placeholder="Encoder name"
                  readOnly
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-b pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plate_number">Plate Number</Label>
                <Input
                  id="plate_number"
                  value={formData.plate_number}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                  placeholder="Enter plate number or N/A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Input
                  id="remarks"
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="Additional notes"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Expense Particulars</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addParticular}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Particular
              </Button>
            </div>

            <div className="space-y-3">
              {particulars.map((particular, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`particular_name_${index}`}>
                          Description *
                        </Label>
                        <Input
                          id={`particular_name_${index}`}
                          value={particular.particular_name}
                          onChange={(e) => updateParticular(index, "particular_name", e.target.value)}
                          placeholder="e.g., Fuel for delivery truck"
                          required
                        />
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 space-y-2">
                          <Label htmlFor={`supplier_${index}`}>Supplier *</Label>
                          <Select
                            value={particular.supplier_id}
                            onValueChange={(value) => updateParticular(index, "supplier_id", value)}
                            disabled={isLoadingSuppliers}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={isLoadingSuppliers ? "Loading..." : "Select supplier"} />
                            </SelectTrigger>
                            <SelectContent>
                              {suppliers.map((supplier) => (
                                <SelectItem key={supplier.id} value={supplier.id}>
                                  {supplier.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => setIsSupplierDialogOpen(true)}
                            title="Add new supplier"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor={`amount_${index}`}>Amount (₱) *</Label>
                          <Input
                            id={`amount_${index}`}
                            type="number"
                            step="0.01"
                            value={particular.amount}
                            onChange={(e) => updateParticular(index, "amount", e.target.value)}
                            placeholder="0.00"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`category_${index}`}>Category</Label>
                          <Select
                            value={particular.category}
                            onValueChange={(value) => updateParticular(index, "category", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="utilities">Utilities</SelectItem>
                              <SelectItem value="rent">Rent</SelectItem>
                              <SelectItem value="fuel">Fuel</SelectItem>
                              <SelectItem value="repairs">Repairs</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="office_supplies">Office Supplies</SelectItem>
                              <SelectItem value="transportation">Transportation</SelectItem>
                              <SelectItem value="misc">Miscellaneous</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    {particulars.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParticular(index)}
                        className="mt-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <span className="font-semibold">Total Amount:</span>
              <span className="text-2xl font-bold">₱{calculateTotal().toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !isFormValid()}>
              {isSubmitting 
                ? (editingExpense ? "Updating..." : "Saving...") 
                : (editingExpense ? "Update Expense" : "Save Expense")
              }
            </Button>
          </div>
        </form>

        <AddSupplierMiniDialog
          open={isSupplierDialogOpen}
          onOpenChange={setIsSupplierDialogOpen}
          onSupplierAdded={handleSupplierAdded}
        />
      </DialogContent>
    </Dialog>
  );
};
