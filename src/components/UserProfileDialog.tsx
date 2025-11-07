import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userEmail: string;
  currentFirstName: string | null;
  currentLastName: string | null;
  currentRoles: string[];
  onSuccess: () => void;
}

const availableRoles = [
  { value: "super_admin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
  { value: "sales", label: "Sales" },
  { value: "inventory", label: "Inventory" },
  { value: "finance", label: "Finance" },
];

export const UserProfileDialog = ({
  open,
  onOpenChange,
  userId,
  userEmail,
  currentFirstName,
  currentLastName,
  currentRoles,
  onSuccess,
}: UserProfileDialogProps) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setFirstName(currentFirstName || "");
      setLastName(currentLastName || "");
      setSelectedRoles(currentRoles);
    }
  }, [open, currentFirstName, currentLastName, currentRoles]);

  const handleToggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Compute full_name from first_name and last_name
      const full_name = `${firstName.trim()} ${lastName.trim()}`.trim();
      
      // Update user profile name
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          first_name: firstName.trim() || null,
          last_name: lastName.trim() || null,
          full_name: full_name || null
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Update roles
      // First, delete all existing roles for this user
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      if (deleteError) throw deleteError;

      // Then insert the new roles
      if (selectedRoles.length > 0) {
        const rolesToInsert = selectedRoles.map((role) => ({
          user_id: userId,
          role: role as any,
        }));

        const { error: insertError } = await supabase
          .from("user_roles")
          .insert(rolesToInsert);

        if (insertError) throw insertError;
      }

      toast.success("User profile updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating user profile:", error);
      toast.error("Failed to update user profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage User Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-base font-semibold">Roles</Label>
            <div className="space-y-3">
              {availableRoles.map((role) => (
                <div key={role.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={role.value}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => handleToggleRole(role.value)}
                  />
                  <Label
                    htmlFor={role.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {role.label}
                  </Label>
                </div>
              ))}
            </div>

            {selectedRoles.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Note: User will have no roles assigned
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
