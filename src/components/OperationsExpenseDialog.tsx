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

const expenseSchema = z.object({
  voucher_number: z.string().trim().min(1, "Voucher number is required").max(50, "Voucher number must be less than 50 characters"),
  voucher_type: z.string().min(1, "Voucher type is required"),
  particulars: z.string().trim().min(1, "Particulars is required").max(1000, "Particulars must be less than 1000 characters"),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 10000000;
  }, "Amount must be a positive number less than 10,000,000"),
  branch: z.string().trim().min(1, "Branch is required").max(100, "Branch must be less than 100 characters"),
  category: z.string().min(1, "Category is required"),
  plate_number: z.string().max(20, "Plate number must be less than 20 characters").optional(),
  remarks: z.string().max(500, "Remarks must be less than 500 characters").optional(),
  encoder: z.string(),
  date: z.string()
});

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
    encoder: "Current User", // Default value - you can replace with actual user from auth
    particulars: "",
    category: "",
    plate_number: "",
    amount: "",
    remarks: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when editing expense changes
  useEffect(() => {
    if (editingExpense) {
      setFormData({
        voucher_number: editingExpense.voucher_number,
        voucher_type: editingExpense.voucher_type,
        date: editingExpense.date,
        branch: editingExpense.branch,
        encoder: editingExpense.encoder,
        particulars: editingExpense.particulars,
        category: editingExpense.category,
        plate_number: editingExpense.plate_number || "",
        amount: editingExpense.amount.toString(),
        remarks: editingExpense.remarks || "",
      });
    } else {
      setFormData({
        voucher_number: "",
        voucher_type: "",
        date: new Date().toISOString().split("T")[0],
        branch: "",
        encoder: "Current User",
        particulars: "",
        category: "",
        plate_number: "",
        amount: "",
        remarks: "",
      });
    }
  }, [editingExpense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data with zod
    const validation = expenseSchema.safeParse(formData);
    if (!validation.success) {
      const firstError = validation.error.errors[0];
      toast.error(firstError.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        plate_number: formData.plate_number === "N/A" || !formData.plate_number ? null : formData.plate_number,
      };

      if (editingExpense) {
        // Update existing expense
        const { error } = await supabase
          .from("operations_expense")
          .update(submitData)
          .eq("id", editingExpense.id);

        if (error) throw error;
        toast.success("Expense updated successfully");
      } else {
        // Create new expense
        const { error } = await supabase.from("operations_expense").insert([submitData]);

        if (error) throw error;
        toast.success("Expense added successfully");
      }

      onExpenseAdded();
      onOpenChange(false);
    } catch (error) {
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

          <div className="space-y-4">
            <h3 className="font-semibold">Expense Details</h3>
            <div className="space-y-2">
              <Label htmlFor="particulars">Particulars *</Label>
              <Textarea
                id="particulars"
                value={formData.particulars}
                onChange={(e) => setFormData({ ...formData, particulars: e.target.value })}
                placeholder="Describe the expense"
                rows={3}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fuel">Fuel</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="office_supplies">Office Supplies</SelectItem>
                    <SelectItem value="utilities">Utilities</SelectItem>
                    <SelectItem value="transportation">Transportation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="plate_number">Plate Number</Label>
                <Input
                  id="plate_number"
                  value={formData.plate_number}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                  placeholder="Enter plate number or N/A"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₱) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
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

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting 
                ? (editingExpense ? "Updating..." : "Adding...") 
                : (editingExpense ? "Update Expense" : "Add Expense")
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
