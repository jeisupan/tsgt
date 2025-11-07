import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SupplierDialog } from "@/components/SupplierDialog";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import { maskEmail, maskPhone, maskAddress, maskTin } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";

interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  tin_number: string | null;
  created_at: string;
}

export const SupplierManagement = () => {
  const { role } = useUserRole();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const canViewSensitiveData = role === "admin" || role === "super_admin" || role === "finance" || role === "inventory";

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("Failed to load suppliers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;

    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);

      if (error) throw error;

      toast.success("Supplier deleted successfully");
      fetchSuppliers();
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast.error("Failed to delete supplier");
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setIsDialogOpen(true);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingSupplier(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Supplier Management</h2>
        <Button onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      {isLoading ? (
        <p>Loading suppliers...</p>
      ) : suppliers.length === 0 ? (
        <p className="text-muted-foreground">No suppliers found. Add your first supplier!</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>TIN Number</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((supplier) => (
                <TableRow key={supplier.id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell>{canViewSensitiveData ? supplier.tin_number || "-" : maskTin(supplier.tin_number)}</TableCell>
                  <TableCell>{canViewSensitiveData ? supplier.email || "-" : maskEmail(supplier.email)}</TableCell>
                  <TableCell>{canViewSensitiveData ? supplier.phone || "-" : maskPhone(supplier.phone)}</TableCell>
                  <TableCell>{canViewSensitiveData ? supplier.address || "-" : maskAddress(supplier.address)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(supplier)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(supplier.id)}
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

      <SupplierDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onSupplierAdded={fetchSuppliers}
        editingSupplier={editingSupplier}
      />
    </div>
  );
};
