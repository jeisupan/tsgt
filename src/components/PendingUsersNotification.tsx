import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Bell } from "lucide-react";

interface PendingUsersNotificationProps {
  onViewUsers: () => void;
  isVisible: boolean;
}

export const PendingUsersNotification = ({ onViewUsers, isVisible }: PendingUsersNotificationProps) => {
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingUsers, setPendingUsers] = useState<Array<{ email: string; full_name: string }>>([]);

  useEffect(() => {
    if (isVisible) {
      checkPendingUsers();
    }
  }, [isVisible]);

  const checkPendingUsers = async () => {
    try {
      // Get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name");

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return;
      }

      if (!profiles || profiles.length === 0) {
        console.log("No profiles found");
        return;
      }

      // Get all user roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id");

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
        return;
      }

      const userIdsWithRoles = new Set(roles?.map(r => r.user_id) || []);
      
      // Find users without roles
      const usersWithoutRoles = profiles?.filter(profile => !userIdsWithRoles.has(profile.id)) || [];
      
      console.log("Pending users found:", usersWithoutRoles);
      
      setPendingCount(usersWithoutRoles.length);
      setPendingUsers(usersWithoutRoles);
      
      // Show dialog only if there are pending users
      if (usersWithoutRoles.length > 0) {
        console.log("Opening notification dialog for", usersWithoutRoles.length, "users");
        setOpen(true);
      }
    } catch (error) {
      console.error("Error checking pending users:", error);
    }
  };

  const handleViewUsers = () => {
    setOpen(false);
    onViewUsers();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-orange-100">
              <Bell className="h-5 w-5 text-orange-600" />
            </div>
            <AlertDialogTitle>Pending User Approvals</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <p>
              You have <strong>{pendingCount}</strong> {pendingCount === 1 ? "user" : "users"} waiting for role assignment:
            </p>
            <div className="bg-muted rounded-lg p-3 max-h-40 overflow-y-auto">
              <ul className="space-y-2">
                {pendingUsers.map((user, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{user.full_name || "Unknown"}</span>
                    <span className="text-muted-foreground">({user.email})</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm">
              These users cannot access the system until you assign them roles.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleViewUsers}>
            Go to User Management
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
