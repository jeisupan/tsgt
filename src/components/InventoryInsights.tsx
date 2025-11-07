import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, BarChart3, TrendingUp, Package, Lightbulb } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

// Simple markdown-to-HTML converter for basic formatting
const renderMarkdown = (text: string) => {
  return text
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-5 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    // Bold
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold">$1</strong>')
    // Bullet lists
    .replace(/^\* (.*$)/gim, '<li class="ml-6">$1</li>')
    .replace(/^- (.*$)/gim, '<li class="ml-6">$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p class="my-2">')
    .replace(/\n/g, '<br/>');
};

const InventoryInsights = () => {
  const [reportType, setReportType] = useState<string>("general-insights");
  const [insights, setInsights] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string>("");
  const { toast } = useToast();
  const { accountId, role } = useUserRole();

  const reportTypes = [
    { value: "general-insights", label: "General Insights", icon: Lightbulb },
    { value: "stock-levels", label: "Stock Level Analysis", icon: Package },
    { value: "sales-trends", label: "Sales Trends", icon: TrendingUp },
    { value: "reorder-suggestions", label: "Reorder Suggestions", icon: BarChart3 },
  ];

  const generateInsights = async () => {
    if (!accountId && role !== "super_admin") {
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
        body: { 
          reportType, 
          accountId,
          isSuperAdmin: role === "super_admin"
        },
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
          {role === "super_admin" && <span className="ml-2 text-primary font-semibold">(Analyzing all accounts)</span>}
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
            <div 
              className="prose prose-sm max-w-none dark:prose-invert text-foreground"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(insights) }}
            />
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