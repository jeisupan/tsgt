import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reportType, accountId, isSuperAdmin } = await req.json();
    
    console.log('Generating inventory insights:', { reportType, accountId, isSuperAdmin });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build queries conditionally based on super_admin status
    let inventoryQuery = supabase.from('inventory').select('*');
    let productsQuery = supabase.from('products').select('*');
    let ordersQuery = supabase
      .from('orders')
      .select('*, order_items(*)')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    // Only filter by account_id if not super_admin or if specific account selected
    if (!isSuperAdmin && accountId) {
      inventoryQuery = inventoryQuery.eq('account_id', accountId);
      productsQuery = productsQuery.eq('account_id', accountId);
      ordersQuery = ordersQuery.eq('account_id', accountId);
    } else if (isSuperAdmin && accountId) {
      // Super admin filtering by specific account
      inventoryQuery = inventoryQuery.eq('account_id', accountId);
      productsQuery = productsQuery.eq('account_id', accountId);
      ordersQuery = ordersQuery.eq('account_id', accountId);
    }

    // Fetch accounts data to get account names
    let accountsQuery = supabase.from('accounts').select('id, account_name');
    if (!isSuperAdmin && accountId) {
      accountsQuery = accountsQuery.eq('id', accountId);
    } else if (isSuperAdmin && accountId) {
      accountsQuery = accountsQuery.eq('id', accountId);
    }

    const { data: accountsData, error: accountsError } = await accountsQuery;
    
    if (accountsError) {
      console.error('Error fetching accounts:', accountsError);
    }

    // Create account name mapping
    const accountMap = new Map();
    accountsData?.forEach(acc => {
      accountMap.set(acc.id, acc.account_name);
    });

    // Fetch inventory data
    const { data: inventoryData, error: inventoryError } = await inventoryQuery;

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError);
      throw inventoryError;
    }

    // Fetch products data
    const { data: productsData, error: productsError } = await productsQuery;

    if (productsError) {
      console.error('Error fetching products:', productsError);
      throw productsError;
    }

    // Enrich inventory with product details and account names
    const enrichedInventory = inventoryData?.map(inv => {
      const product = productsData?.find(p => p.id === inv.product_id);
      return {
        ...inv,
        product_name: inv.product_name || product?.name || 'Unknown',
        product_price: product?.price || 0,
        product_category: inv.product_category || product?.category || 'Unknown',
        account_name: accountMap.get(inv.account_id) || 'Unknown Account'
      };
    }) || [];

    // Fetch recent orders for sales insights
    const { data: ordersData, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
    }

    // Enrich orders with account names
    const enrichedOrders = ordersData?.map(order => ({
      ...order,
      account_name: accountMap.get(order.account_id) || 'Unknown Account'
    })) || [];

    // Prepare system prompt based on report type
    let systemPrompt = '';
    let dataContext = '';
    
    const accountScope = isSuperAdmin && !accountId ? ' across all accounts' : '';
    const accountLabel = accountId && accountsData?.length === 1 
      ? ` for ${accountsData[0].account_name}` 
      : accountScope;

    switch (reportType) {
      case 'stock-levels':
        systemPrompt = `You are an inventory management expert. Analyze the current stock levels${accountLabel} and provide insights on:
- Items running low on stock that need reordering
- Overstocked items
- Stock distribution across categories${isSuperAdmin && !accountId ? ' and accounts' : ''}
- Recommendations for optimal stock levels

When referencing data, use the account_name field to identify which account each item belongs to.
Format your response in clear sections with bullet points and actionable recommendations.`;
        dataContext = `Current Inventory${accountLabel}:\n${JSON.stringify(enrichedInventory, null, 2)}`;
        break;

      case 'sales-trends':
        systemPrompt = `You are a sales analytics expert. Analyze the sales data${accountLabel} and provide insights on:
- Best-selling products${isSuperAdmin && !accountId ? ' across all accounts' : ''}
- Sales trends over the past 30 days
- Revenue patterns${isSuperAdmin && !accountId ? ' by account' : ''}
- Product performance by category
- Recommendations for inventory adjustments based on sales

When referencing data, use the account_name field to identify which account each order belongs to.
Format your response in clear sections with bullet points and actionable insights.`;
        dataContext = `Inventory${accountLabel}:\n${JSON.stringify(enrichedInventory, null, 2)}\n\nRecent Orders (Last 30 days)${accountLabel}:\n${JSON.stringify(enrichedOrders, null, 2)}`;
        break;

      case 'reorder-suggestions':
        systemPrompt = `You are a supply chain optimization expert. Analyze inventory levels and sales patterns${accountLabel} to provide:
- Specific products that should be reordered now
- Suggested reorder quantities based on sales velocity
- Priority levels for each reorder${isSuperAdmin && !accountId ? ' organized by account' : ''}
- Estimated costs and timing considerations

When referencing data, use the account_name field to identify which account each item belongs to.
Format your response as a prioritized list with specific actionable recommendations.`;
        dataContext = `Inventory${accountLabel}:\n${JSON.stringify(enrichedInventory, null, 2)}\n\nRecent Orders (Last 30 days)${accountLabel}:\n${JSON.stringify(enrichedOrders, null, 2)}`;
        break;

      case 'general-insights':
      default:
        systemPrompt = `You are a business intelligence expert specializing in inventory management. Provide a comprehensive analysis${accountLabel} covering:
- Overall inventory health${isSuperAdmin && !accountId ? ' by account' : ''}
- Key metrics and KPIs
- Top opportunities for improvement
- Risk factors or concerns
- Strategic recommendations${isSuperAdmin && !accountId ? ' for each account' : ''}

When referencing data, use the account_name field to identify which account each item belongs to.
Format your response in clear, actionable sections.`;
        dataContext = `Inventory${accountLabel}:\n${JSON.stringify(enrichedInventory, null, 2)}\n\nRecent Orders (Last 30 days)${accountLabel}:\n${JSON.stringify(enrichedOrders, null, 2)}`;
    }

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: dataContext }
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'AI credits depleted. Please add credits to your workspace.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const errorText = await aiResponse.text();
      console.error('AI gateway error:', aiResponse.status, errorText);
      throw new Error('Failed to generate insights');
    }

    const aiData = await aiResponse.json();
    const insights = aiData.choices[0].message.content;

    console.log('Successfully generated insights');

    return new Response(JSON.stringify({ 
      insights,
      reportType,
      generatedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in inventory-insights function:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});