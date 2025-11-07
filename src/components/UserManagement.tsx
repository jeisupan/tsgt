import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Shield, Settings, Search } from "lucide-react";
import { UserProfileDialog } from "./UserProfileDialog";
import { useUserRole } from "@/hooks/useUserRole";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  first_name?: string | null;
  last_name?: string | null;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [accounts, setAccounts] = useState<Account[]>([]);

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
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("id, account_name");

      if (accountsError) {
        console.error("Error fetching accounts:", accountsError);
      } else if (accountsData) {
        // Set accounts for filter dropdown
        setAccounts(accountsData);
        
        accountsMap = accountsData.reduce((acc, account) => {
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

  // Filter users based on search query and selected account
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesAccount = 
      selectedAccount === "all" || 
      selectedAccount === "no-account" && !user.account_id ||
      user.account_id === selectedAccount;
    
    return matchesSearch && matchesAccount;
  });


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
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {isSuperAdmin && accounts.length > 0 && (
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-full sm:w-[250px]">
                  <SelectValue placeholder="Filter by account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  <SelectItem value="no-account">No Account</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
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
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 4 : 3} className="text-center text-muted-foreground py-8">
                    No users found matching your filters
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
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
                ))
              )}
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
          currentFirstName={selectedUser.first_name || null}
          currentLastName={selectedUser.last_name || null}
          currentRoles={selectedUser.roles}
          onSuccess={fetchUsers}
        />
      )}
    </>
  );
};
