import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Edit, DollarSign, Star } from "lucide-react";

interface Tier {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  is_popular: boolean;
  sort_order: number;
}

interface TierFeature {
  id: string;
  tier_id: string;
  feature_name: string;
  sort_order: number;
}

export const PricingTierManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<Tier | null>(null);
  const [tierForm, setTierForm] = useState({
    name: "",
    price: "",
    period: "/month",
    description: "",
    is_popular: false,
    sort_order: 0,
  });
  const [features, setFeatures] = useState<string[]>([""]);
  
  const queryClient = useQueryClient();

  const { data: tiers, isLoading } = useQuery({
    queryKey: ['admin-pricing-tiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pricing_tiers')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as Tier[];
    }
  });

  const { data: tierFeatures } = useQuery({
    queryKey: ['admin-tier-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tier_features')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as TierFeature[];
    }
  });

  const createTierMutation = useMutation({
    mutationFn: async (newTier: typeof tierForm) => {
      const { data: tier, error: tierError } = await supabase
        .from('pricing_tiers')
        .insert([newTier])
        .select()
        .single();
      
      if (tierError) throw tierError;

      const featureInserts = features
        .filter(f => f.trim())
        .map((feature, index) => ({
          tier_id: tier.id,
          feature_name: feature,
          sort_order: index + 1
        }));

      if (featureInserts.length > 0) {
        const { error: featuresError } = await supabase
          .from('tier_features')
          .insert(featureInserts);
        
        if (featuresError) throw featuresError;
      }

      return tier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing-tiers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tier-features'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-tiers'] });
      toast.success("Pricing tier created successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to create tier: ${error.message}`);
    }
  });

  const updateTierMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: typeof tierForm }) => {
      const { error: tierError } = await supabase
        .from('pricing_tiers')
        .update(updates)
        .eq('id', id);
      
      if (tierError) throw tierError;

      // Delete existing features
      const { error: deleteError } = await supabase
        .from('tier_features')
        .delete()
        .eq('tier_id', id);
      
      if (deleteError) throw deleteError;

      // Insert new features
      const featureInserts = features
        .filter(f => f.trim())
        .map((feature, index) => ({
          tier_id: id,
          feature_name: feature,
          sort_order: index + 1
        }));

      if (featureInserts.length > 0) {
        const { error: featuresError } = await supabase
          .from('tier_features')
          .insert(featureInserts);
        
        if (featuresError) throw featuresError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing-tiers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tier-features'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-tiers'] });
      toast.success("Pricing tier updated successfully");
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast.error(`Failed to update tier: ${error.message}`);
    }
  });

  const deleteTierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('pricing_tiers')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pricing-tiers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-tier-features'] });
      queryClient.invalidateQueries({ queryKey: ['pricing-tiers'] });
      toast.success("Pricing tier deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete tier: ${error.message}`);
    }
  });

  const resetForm = () => {
    setTierForm({
      name: "",
      price: "",
      period: "/month",
      description: "",
      is_popular: false,
      sort_order: 0,
    });
    setFeatures([""]);
    setEditingTier(null);
  };

  const handleEdit = (tier: Tier) => {
    setEditingTier(tier);
    setTierForm({
      name: tier.name,
      price: tier.price,
      period: tier.period,
      description: tier.description,
      is_popular: tier.is_popular,
      sort_order: tier.sort_order,
    });
    
    const tierFeats = tierFeatures?.filter(f => f.tier_id === tier.id) || [];
    setFeatures(tierFeats.length > 0 ? tierFeats.map(f => f.feature_name) : [""]);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingTier) {
      updateTierMutation.mutate({ id: editingTier.id, updates: tierForm });
    } else {
      createTierMutation.mutate(tierForm);
    }
  };

  const addFeatureField = () => {
    setFeatures([...features, ""]);
  };

  const removeFeatureField = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const updateFeature = (index: number, value: string) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  if (isLoading) {
    return <div>Loading pricing tiers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Pricing Tier Management</h2>
          <p className="text-muted-foreground">Manage pricing tiers shown on the landing page</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTier ? "Edit" : "Create"} Pricing Tier</DialogTitle>
              <DialogDescription>
                Configure the pricing tier details and features
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Tier Name</Label>
                  <Input
                    id="name"
                    value={tierForm.name}
                    onChange={(e) => setTierForm({ ...tierForm, name: e.target.value })}
                    placeholder="e.g., Professional"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price</Label>
                  <Input
                    id="price"
                    value={tierForm.price}
                    onChange={(e) => setTierForm({ ...tierForm, price: e.target.value })}
                    placeholder="e.g., ₱2,499"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="period">Period</Label>
                  <Input
                    id="period"
                    value={tierForm.period}
                    onChange={(e) => setTierForm({ ...tierForm, period: e.target.value })}
                    placeholder="e.g., /month"
                  />
                </div>
                <div>
                  <Label htmlFor="sort_order">Sort Order</Label>
                  <Input
                    id="sort_order"
                    type="number"
                    value={tierForm.sort_order}
                    onChange={(e) => setTierForm({ ...tierForm, sort_order: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={tierForm.description}
                  onChange={(e) => setTierForm({ ...tierForm, description: e.target.value })}
                  placeholder="Brief description of this tier"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_popular"
                  checked={tierForm.is_popular}
                  onCheckedChange={(checked) => setTierForm({ ...tierForm, is_popular: checked })}
                />
                <Label htmlFor="is_popular">Mark as Popular</Label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Features</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addFeatureField}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add Feature
                  </Button>
                </div>
                {features.map((feature, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      placeholder="Feature name"
                    />
                    {features.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeFeatureField(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button onClick={handleSubmit} className="w-full">
                {editingTier ? "Update" : "Create"} Tier
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tiers?.map((tier) => {
          const tierFeats = tierFeatures?.filter(f => f.tier_id === tier.id) || [];
          return (
            <Card key={tier.id} className="relative">
              {tier.is_popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                  <Star className="h-3 w-3 mr-1" />
                  Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  {tier.name}
                </CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="text-3xl font-bold mt-2">
                  {tier.price}
                  <span className="text-sm text-muted-foreground">{tier.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Features:</p>
                  <ul className="space-y-1">
                    {tierFeats.map((feature) => (
                      <li key={feature.id} className="text-sm text-muted-foreground">
                        • {feature.feature_name}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleEdit(tier)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Delete ${tier.name} tier?`)) {
                        deleteTierMutation.mutate(tier.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
