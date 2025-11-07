import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, BarChart3, TrendingUp, Package, Lightbulb } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

const InventoryInsights = () => {
  const [reportType, setReportType] = useState<string>("general-insights");
  const [insights, setInsights] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const { toast } = useToast();
  const { accountId } = useUserRole();

  const reportTypes = [
    { value: "general-insights", label: "General Insights", icon: Lightbulb },
    { value: "stock-levels", label: "Stock Level Analysis", icon: Package },
    { value: "sales-trends", label: "Sales Trends", icon: TrendingUp },
    { value: "reorder-suggestions", label: "Reorder Suggestions", icon: BarChart3 },
  ];

  const generateInsights = async () => {
    if (!accountId) {
      toast({
        title: "Error",
        description: "Account information not available",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setInsights("");

    try {
      const { data, error } = await supabase.functions.invoke("inventory-insights", {
        body: { reportType, accountId },
      });

      if (error) {
        console.error("Error generating insights:", error);
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setInsights(data.insights);
      setGeneratedAt(data.generatedAt);

      toast({
        title: "Insights Generated",
        description: "AI analysis completed successfully",
      });
    } catch (error: any) {
      console.error("Error:", error);
      
      let errorMessage = "Failed to generate insights. Please try again.";
      if (error.message?.includes("Rate limit")) {
        errorMessage = "Rate limit exceeded. Please try again in a few moments.";
      } else if (error.message?.includes("credits")) {
        errorMessage = "AI credits depleted. Please add credits to continue.";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedReport = reportTypes.find((r) => r.value === reportType);
  const Icon = selectedReport?.icon || Lightbulb;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">AI Inventory Insights</h2>
        <p className="text-muted-foreground mt-2">
          Generate automated reports and insights powered by AI
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Report</CardTitle>
          <CardDescription>
            Select a report type and let AI analyze your inventory data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((type) => {
                    const TypeIcon = type.icon;
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4" />
                          {type.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateInsights} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Icon className="mr-2 h-4 w-4" />
                  Generate Insights
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              {selectedReport?.label}
            </CardTitle>
            <CardDescription>
              Generated on {new Date(generatedAt).toLocaleString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap text-foreground">{insights}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {!insights && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Select a report type and click "Generate Insights" to get started
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InventoryInsights;