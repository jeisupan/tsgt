import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Package, AlertTriangle, DollarSign } from "lucide-react";

interface InsightsVisualizationProps {
  inventoryData: any[];
  ordersData: any[];
  reportType: string;
}

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export const InsightsVisualization: React.FC<InsightsVisualizationProps> = ({
  inventoryData,
  ordersData,
  reportType,
}) => {
  // Calculate key metrics
  const totalItems = inventoryData.length;
  const lowStockItems = inventoryData.filter(item => item.current_stock < (item.min_stock_level || 10)).length;
  const totalStock = inventoryData.reduce((sum, item) => sum + item.current_stock, 0);
  const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total || 0), 0);

  // Category distribution
  const categoryData = inventoryData.reduce((acc: any, item) => {
    const category = item.product_category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = { name: category, value: 0, stock: 0 };
    }
    acc[category].value += 1;
    acc[category].stock += item.current_stock;
    return acc;
  }, {});

  const categoryChartData = Object.values(categoryData);

  // Stock levels by product
  const stockByProduct = inventoryData
    .sort((a, b) => a.current_stock - b.current_stock)
    .slice(0, 10)
    .map(item => ({
      name: item.product_name?.substring(0, 15) || 'Unknown',
      stock: item.current_stock,
      minStock: item.min_stock_level || 10,
    }));

  // Sales trend (last 7 days)
  const salesTrend = ordersData
    .reduce((acc: any[], order) => {
      const date = new Date(order.created_at).toLocaleDateString();
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.sales += order.total || 0;
        existing.orders += 1;
      } else {
        acc.push({ date, sales: order.total || 0, orders: 1 });
      }
      return acc;
    }, [])
    .slice(-7);

  // Account-wise revenue (if multiple accounts)
  const accountRevenue = ordersData.reduce((acc: any, order) => {
    const accountName = order.account_name || 'Unknown';
    if (!acc[accountName]) {
      acc[accountName] = { name: accountName, revenue: 0, orders: 0 };
    }
    acc[accountName].revenue += order.total || 0;
    acc[accountName].orders += 1;
    return acc;
  }, {});

  const accountRevenueData = Object.values(accountRevenue);

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">Unique items in inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alert</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems}</div>
            <p className="text-xs text-muted-foreground">Items below minimum level</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Units across all products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        {categoryChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Inventory by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => entry.name}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Stock Levels */}
        {stockByProduct.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Stock Levels (Top 10 Lowest)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stockByProduct}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="stock" fill="hsl(var(--chart-1))" name="Current Stock" />
                  <Bar dataKey="minStock" fill="hsl(var(--chart-2))" name="Min Level" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sales and Revenue Charts */}
      {ordersData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend */}
          {salesTrend.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="hsl(var(--chart-3))" name="Sales (₱)" />
                    <Line type="monotone" dataKey="orders" stroke="hsl(var(--chart-4))" name="Orders" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Account Revenue */}
          {accountRevenueData.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Account</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={accountRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="revenue" fill="hsl(var(--chart-5))" name="Revenue (₱)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};