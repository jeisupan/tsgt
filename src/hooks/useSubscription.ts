import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";

interface TierLimits {
  maxProducts: number;
  maxUsers: number;
  hasTransactionHistory: boolean;
  tierName: string;
  historyDays: number | null;
}

const FREE_TIER_LIMITS: TierLimits = {
  maxProducts: 10,
  maxUsers: 1,
  hasTransactionHistory: false,
  tierName: "Free Trial",
  historyDays: null
};

const GROWTH_TIER_LIMITS: TierLimits = {
  maxProducts: 100,
  maxUsers: 3,
  hasTransactionHistory: true,
  tierName: "Growth",
  historyDays: 30
};

export const useSubscription = () => {
  const { accountId } = useUserRole();
  const [tierLimits, setTierLimits] = useState<TierLimits>(FREE_TIER_LIMITS);
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [userCount, setUserCount] = useState(0);

  useEffect(() => {
    if (accountId) {
      fetchSubscription();
      fetchCounts();
    }
  }, [accountId]);

  const fetchSubscription = async () => {
    if (!accountId) return;

    try {
      const { data: subscription, error } = await supabase
        .from("account_subscriptions")
        .select(`
          *,
          tier:pricing_tiers(name)
        `)
        .eq("account_id", accountId)
        .eq("status", "active")
        .maybeSingle();

      if (error) {
        console.error("Error fetching subscription:", error);
        setTierLimits(FREE_TIER_LIMITS);
        return;
      }

      if (!subscription || subscription.tier?.name === "Free Trial") {
        setTierLimits(FREE_TIER_LIMITS);
      } else if (subscription.tier?.name === "Growth") {
        setTierLimits(GROWTH_TIER_LIMITS);
      } else {
        // Professional and other tiers get unlimited features
        setTierLimits(GROWTH_TIER_LIMITS);
      }
    } catch (error) {
      console.error("Error in fetchSubscription:", error);
      setTierLimits(FREE_TIER_LIMITS);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    if (!accountId) return;

    try {
      // Count products
      const { count: productsCount, error: productsError } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("account_id", accountId);

      if (productsError) {
        console.error("Error counting products:", productsError);
      } else {
        setProductCount(productsCount || 0);
      }

      // Count users in this account
      const { count: usersCount, error: usersError } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("account_id", accountId);

      if (usersError) {
        console.error("Error counting users:", usersError);
      } else {
        setUserCount(usersCount || 0);
      }
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const canAddProduct = () => {
    return productCount < tierLimits.maxProducts;
  };

  const canAddUser = () => {
    return userCount < tierLimits.maxUsers;
  };

  const getProductLimitMessage = () => {
    return `${productCount} of ${tierLimits.maxProducts} products used`;
  };

  const refreshCounts = () => {
    fetchCounts();
  };

  return {
    tierLimits,
    loading,
    productCount,
    userCount,
    canAddProduct: canAddProduct(),
    canAddUser: canAddUser(),
    getProductLimitMessage,
    refreshCounts,
  };
};
