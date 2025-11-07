import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Shield, Settings } from "lucide-react";
import { UserProfileDialog } from "./UserProfileDialog";
import { useUserRole } from "@/hooks/useUserRole";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  account_id: string | null;
}

interface Account {
  id: string;
  account_name: string;
}

interface UserWithRoles extends Profile {
  roles: string[];
  account_name?: string | null;
}

const roleColors: Record<string, string> = {
  super_admin: "bg-purple-500",
  admin: "bg-blue-500",
  sales: "bg-green-500",
  inventory: "bg-orange-500",
  finance: "bg-yellow-500",
};

const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  sales: "Sales",
  inventory: "Inventory",
  finance: "Finance",
};

export const UserManagement = () => {
  const { role } = useUserRole();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isRolesDialogOpen, setIsRolesDialogOpen] = useState(false);

  const isSuperAdmin = role === "super_admin";

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    
    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      toast.error("Failed to load users");
      setLoading(false);
      return;
    }

    // Fetch accounts if super_admin
    let accountsMap: Record<string, string> = {};
    if (isSuperAdmin) {
      const { data: accounts, error: accountsError } = await supabase
        .from("accounts")
        .select("id, account_name");

      if (accountsError) {
        console.error("Error fetching accounts:", accountsError);
      } else if (accounts) {
        accountsMap = accounts.reduce((acc, account) => {
          acc[account.id] = account.account_name;
          return acc;
        }, {} as Record<string, string>);
        console.log("Accounts map:", accountsMap);
      }
    }

    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("*");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }

    const usersWithRoles = profiles
      .filter(profile => profile.id !== currentUser?.id) // Exclude current user
      .map((profile) => {
        const roles = userRoles?.filter((r) => r.user_id === profile.id).map((r) => r.role) || [];
        const accountName = profile.account_id && accountsMap[profile.account_id] 
          ? accountsMap[profile.account_id] 
          : null;
        
        console.log(`Profile ${profile.email}: account_id=${profile.account_id}, accountName=${accountName}`);
        
        return {
          ...profile,
          roles,
          account_name: accountName,
        };
      });

    setUsers(usersWithRoles);
    setLoading(false);
  };

  const handleManageRoles = (user: UserWithRoles) => {
    setSelectedUser(user);
    setIsRolesDialogOpen(true);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>Manage user access and roles for registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                {isSuperAdmin && <TableHead>Account</TableHead>}
                <TableHead>Roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleManageRoles(user)}
                        className="h-6 w-6"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      <span>{user.full_name || "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  {isSuperAdmin && (
                    <TableCell>
                      {user.account_name ? (
                        <Badge variant="outline">{user.account_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">No Account</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {user.roles.length > 0 ? (
                        user.roles.map((role) => (
                          <Badge key={role} className={roleColors[role]}>
                            {roleLabels[role]}
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline">No Roles</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedUser && (
        <UserProfileDialog
          open={isRolesDialogOpen}
          onOpenChange={setIsRolesDialogOpen}
          userId={selectedUser.id}
          userEmail={selectedUser.email}
          currentFullName={selectedUser.full_name}
          currentRoles={selectedUser.roles}
          onSuccess={fetchUsers}
        />
      )}
    </>
  );
};
