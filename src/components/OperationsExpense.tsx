import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { OperationsExpenseDialog } from "@/components/OperationsExpenseDialog";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Plus } from "lucide-react";

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
  created_at: string;
}

export const OperationsExpense = () => {
  const [expenses, setExpenses] = useState<OperationsExpense[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingExpense, setEditingExpense] = useState<OperationsExpense | null>(null);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("operations_expense")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;

    try {
      const { error } = await supabase.from("operations_expense").delete().eq("id", id);

      if (error) throw error;

      toast.success("Expense deleted successfully");
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
    }
  };

  const handleEdit = (expense: OperationsExpense) => {
    setEditingExpense(expense);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
  };

  const formatCurrency = (amount: number) => {
    return `₱${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Operations Expense</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Expense
        </Button>
      </div>

      {isLoading ? (
        <p>Loading expenses...</p>
      ) : expenses.length === 0 ? (
        <p className="text-muted-foreground">No expenses found. Add your first expense!</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Voucher #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Particulars</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Plate #</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Encoder</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="font-medium">{expense.voucher_number}</TableCell>
                  <TableCell>{formatDate(expense.date)}</TableCell>
                  <TableCell className="capitalize">{expense.voucher_type.replace("_", " ")}</TableCell>
                  <TableCell>{expense.branch}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{expense.particulars}</TableCell>
                  <TableCell className="capitalize">{expense.category.replace("_", " ")}</TableCell>
                  <TableCell>{expense.plate_number || "N/A"}</TableCell>
                  <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
                  <TableCell>{expense.encoder}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(expense)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <OperationsExpenseDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onExpenseAdded={fetchExpenses}
        editingExpense={editingExpense}
      />
    </div>
  );
};
