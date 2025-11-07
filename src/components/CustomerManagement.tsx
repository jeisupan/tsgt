import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CustomerDialog } from "@/components/CustomerDialog";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, UserPlus, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUserRole } from "@/hooks/useUserRole";
import { maskEmail, maskPhone, maskAddress } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  is_active: boolean;
  previous_version?: string | null;
  replaced_by?: string | null;
}

export const CustomerManagement = () => {
  const { role, hasAccess } = useUserRole();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<Customer[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const canViewSensitiveData = role === "admin" || role === "super_admin" || role === "finance";
  const canEditCustomer = role === "admin" || role === "super_admin";

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomerHistory = async (customerId: string) => {
    try {
      const history: Customer[] = [];
      let currentId: string | null = customerId;

      // Trace back through previous versions
      while (currentId) {
        const { data, error } = await supabase
          .from("customers")
          .select("*")
          .eq("id", currentId)
          .single();

        if (error) throw error;
        if (data) {
          history.push(data);
          currentId = data.previous_version;
        } else {
          break;
        }
      }

      setCustomerHistory(history.reverse()); // Show oldest first
      setShowHistory(true);
    } catch (error) {
      console.error("Error fetching customer history:", error);
      toast.error("Failed to load customer history");
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleViewHistory = (customer: Customer) => {
    setHistoryCustomer(customer);
    fetchCustomerHistory(customer.id);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingCustomer(null);
  };

  const handleDuplicateFound = (customer: Customer) => {
    setEditingCustomer(customer);
    // Dialog is already open, just update the editing customer
  };

  if (!hasAccess(["sales", "admin", "super_admin"])) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">
          You don't have permission to access this module.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Customer Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Showing active customers only
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {isLoading ? (
        <p>Loading customers...</p>
      ) : customers.length === 0 ? (
        <p className="text-muted-foreground">No customers found. Add your first customer!</p>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Address</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    {customer.full_name || customer.name}
                  </TableCell>
                  {canViewSensitiveData && <TableCell>{customer.email || "-"}</TableCell>}
                  {canViewSensitiveData && <TableCell>{customer.phone || "-"}</TableCell>}
                  {canViewSensitiveData && <TableCell>{customer.address || "-"}</TableCell>}
                  {!canViewSensitiveData && <TableCell>{maskEmail(customer.email)}</TableCell>}
                  {!canViewSensitiveData && <TableCell>{maskPhone(customer.phone)}</TableCell>}
                  {!canViewSensitiveData && <TableCell>{maskAddress(customer.address)}</TableCell>}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {canEditCustomer && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(customer)}
                          title="Edit customer"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canViewSensitiveData && customer.previous_version && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewHistory(customer)}
                          title="View history"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <CustomerDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        onCustomerAdded={fetchCustomers}
        editingCustomer={editingCustomer}
        onDuplicateFound={handleDuplicateFound}
      />

      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Customer History: {historyCustomer?.full_name || historyCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {customerHistory.map((version, index) => (
              <div
                key={version.id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">
                    Version {customerHistory.length - index}
                  </h4>
                  <div className="flex gap-2">
                    <Badge variant={version.is_active ? "default" : "secondary"}>
                      {version.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(version.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {version.full_name || version.name}
                  </div>
                  <div>
                    <span className="font-medium">Email:</span> {canViewSensitiveData ? version.email || "-" : maskEmail(version.email)}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {canViewSensitiveData ? version.phone || "-" : maskPhone(version.phone)}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium">Address:</span> {canViewSensitiveData ? version.address || "-" : maskAddress(version.address)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
