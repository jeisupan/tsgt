import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface AccountSubscription {
  id: string;
  account_name: string;
  tier_name: string | null;
  tier_price: string | null;
  status: string | null;
  expires_at: string | null;
  account_created_at: string;
  user_count: number;
  product_count: number;
  is_super_admin_account: boolean;
}

export const AccountSubscriptions = () => {
  const { role } = useUserRole();
  const [subscriptions, setSubscriptions] = useState<AccountSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (role !== "super_admin") {
      setLoading(false);
      return;
    }

    fetchAccountSubscriptions();

    // Listen to all relevant table changes
    const channel = supabase
      .channel("account-subscriptions-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "account_subscriptions",
        },
        () => {
          fetchAccountSubscriptions();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "accounts",
        },
        () => {
          fetchAccountSubscriptions();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pricing_tiers",
        },
        () => {
          fetchAccountSubscriptions();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
        },
        () => {
          fetchAccountSubscriptions();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
        },
        () => {
          fetchAccountSubscriptions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role]);

  const fetchAccountSubscriptions = async () => {
    try {
      setLoading(true);

      // Fetch accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("accounts")
        .select("id, account_name, created_at")
        .order("created_at", { ascending: false });

      if (accountsError) {
        console.error("Error fetching accounts:", accountsError);
        throw accountsError;
      }

      // Fetch all subscriptions
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from("account_subscriptions")
        .select("account_id, status, expires_at, tier_id");

      if (subscriptionsError) {
        console.error("Error fetching subscriptions:", subscriptionsError);
        throw subscriptionsError;
      }

      // Fetch all tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from("pricing_tiers")
        .select("id, name, price");

      if (tiersError) {
        console.error("Error fetching tiers:", tiersError);
        throw tiersError;
      }

      // Fetch user counts
      const { data: userCounts, error: userCountsError } = await supabase
        .from("profiles")
        .select("account_id");

      if (userCountsError) {
        console.error("Error fetching user counts:", userCountsError);
        throw userCountsError;
      }

      // Fetch product counts
      const { data: productCounts, error: productCountsError } = await supabase
        .from("products")
        .select("account_id");

      if (productCountsError) {
        console.error("Error fetching product counts:", productCountsError);
        throw productCountsError;
      }

      // Fetch super admin users
      const { data: superAdmins, error: superAdminsError } = await supabase
        .from("user_roles")
        .select("user_id, account_id")
        .eq("role", "super_admin");

      if (superAdminsError) {
        console.error("Error fetching super admins:", superAdminsError);
        throw superAdminsError;
      }

      console.log("Fetched data:", {
        accounts: accountsData?.length,
        subscriptions: subscriptionsData?.length,
        tiers: tiersData?.length,
        users: userCounts?.length,
        products: productCounts?.length
      });

      // Create maps
      const subscriptionMap: Record<string, any> = {};
      subscriptionsData?.forEach((sub: any) => {
        subscriptionMap[sub.account_id] = sub;
      });

      const tierMap: Record<string, any> = {};
      tiersData?.forEach((tier: any) => {
        tierMap[tier.id] = tier;
      });

      const userCountMap: Record<string, number> = {};
      userCounts?.forEach((profile: any) => {
        if (profile.account_id) {
          userCountMap[profile.account_id] = (userCountMap[profile.account_id] || 0) + 1;
        }
      });

      const productCountMap: Record<string, number> = {};
      productCounts?.forEach((product: any) => {
        if (product.account_id) {
          productCountMap[product.account_id] = (productCountMap[product.account_id] || 0) + 1;
        }
      });

      // Create super admin account set
      const superAdminAccountIds = new Set<string>();
      superAdmins?.forEach((admin: any) => {
        if (admin.account_id) {
          superAdminAccountIds.add(admin.account_id);
        }
      });

      // Combine data
      const combinedData: AccountSubscription[] = accountsData?.map((account: any) => {
        const subscription = subscriptionMap[account.id];
        const tier = subscription ? tierMap[subscription.tier_id] : null;
        const isSuperAdminAccount = superAdminAccountIds.has(account.id);

        const result = {
          id: account.id,
          account_name: account.account_name,
          tier_name: tier?.name || null,
          tier_price: tier?.price || null,
          status: subscription?.status || null,
          expires_at: subscription?.expires_at || null,
          account_created_at: account.created_at,
          user_count: userCountMap[account.id] || 0,
          product_count: productCountMap[account.id] || 0,
          is_super_admin_account: isSuperAdminAccount,
        };

        console.log("Account mapping:", {
          account_name: account.account_name,
          has_subscription: !!subscription,
          tier_id: subscription?.tier_id,
          tier_name: tier?.name,
          result
        });

        return result;
      }) || [];

      console.log("Combined data:", combinedData);
      setSubscriptions(combinedData);
    } catch (error) {
      console.error("Error fetching account subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTierBadgeVariant = (tierName: string | null) => {
    if (!tierName) return "outline";
    if (tierName.toLowerCase().includes("free")) return "secondary";
    if (tierName.toLowerCase().includes("growth")) return "default";
    if (tierName.toLowerCase().includes("professional")) return "default";
    return "outline";
  };

  const getStatusBadgeVariant = (status: string | null) => {
    if (!status) return "outline";
    if (status === "active") return "default";
    if (status === "expired") return "destructive";
    if (status === "cancelled") return "secondary";
    return "outline";
  };

  const filteredSubscriptions = subscriptions.filter((sub) => {
    const tierMatch = tierFilter === "all" || sub.tier_name?.toLowerCase().includes(tierFilter.toLowerCase());
    const statusMatch = statusFilter === "all" || sub.status === statusFilter;
    return tierMatch && statusMatch;
  });

  if (role !== "super_admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Restricted</CardTitle>
          <CardDescription>
            This section is only accessible to super administrators.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Subscriptions</CardTitle>
        <CardDescription>
          View and manage subscription tiers for all accounts
        </CardDescription>
        <div className="flex gap-4 mt-4">
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="free">Free Trial</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredSubscriptions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No accounts found matching the filters.
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">Products</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium">{sub.account_name}</TableCell>
                    <TableCell>
                      {sub.is_super_admin_account ? (
                        <Badge variant="default" className="bg-primary">
                          App Owner
                        </Badge>
                      ) : sub.tier_name ? (
                        <Badge variant={getTierBadgeVariant(sub.tier_name)}>
                          {sub.tier_name}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Tier</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {sub.status ? (
                        <Badge variant={getStatusBadgeVariant(sub.status)}>
                          {sub.status}
                        </Badge>
                      ) : (
                        <Badge variant="outline">N/A</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{sub.user_count}</TableCell>
                    <TableCell className="text-right">{sub.product_count}</TableCell>
                    <TableCell>
                      {format(new Date(sub.account_created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      {sub.expires_at
                        ? format(new Date(sub.expires_at), "MMM d, yyyy")
                        : "No expiry"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
