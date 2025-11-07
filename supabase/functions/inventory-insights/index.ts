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

    // Only filter by account_id if not super_admin
    if (!isSuperAdmin && accountId) {
      inventoryQuery = inventoryQuery.eq('account_id', accountId);
      productsQuery = productsQuery.eq('account_id', accountId);
      ordersQuery = ordersQuery.eq('account_id', accountId);
    }

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

    // Enrich inventory with product details
    const enrichedInventory = inventoryData?.map(inv => {
      const product = productsData?.find(p => p.id === inv.product_id);
      return {
        ...inv,
        product_name: inv.product_name || product?.name || 'Unknown',
        product_price: product?.price || 0,
        product_category: inv.product_category || product?.category || 'Unknown'
      };
    }) || [];

    // Fetch recent orders for sales insights
    const { data: ordersData, error: ordersError } = await ordersQuery;

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
    }

    // Prepare system prompt based on report type
    let systemPrompt = '';
    let dataContext = '';

    switch (reportType) {
      case 'stock-levels':
        systemPrompt = `You are an inventory management expert. Analyze the current stock levels${isSuperAdmin ? ' across all accounts' : ''} and provide insights on:
- Items running low on stock that need reordering
- Overstocked items
- Stock distribution across categories${isSuperAdmin ? ' and accounts' : ''}
- Recommendations for optimal stock levels

Format your response in clear sections with bullet points and actionable recommendations.`;
        dataContext = `Current Inventory${isSuperAdmin ? ' (All Accounts)' : ''}:\n${JSON.stringify(enrichedInventory, null, 2)}`;
        break;

      case 'sales-trends':
        systemPrompt = `You are a sales analytics expert. Analyze the sales data${isSuperAdmin ? ' across all accounts' : ''} and provide insights on:
- Best-selling products${isSuperAdmin ? ' across all accounts' : ''}
- Sales trends over the past 30 days
- Revenue patterns${isSuperAdmin ? ' by account' : ''}
- Product performance by category
- Recommendations for inventory adjustments based on sales

Format your response in clear sections with bullet points and actionable insights.`;
        dataContext = `Inventory${isSuperAdmin ? ' (All Accounts)' : ''}:\n${JSON.stringify(enrichedInventory, null, 2)}\n\nRecent Orders (Last 30 days)${isSuperAdmin ? ' (All Accounts)' : ''}:\n${JSON.stringify(ordersData, null, 2)}`;
        break;

      case 'reorder-suggestions':
        systemPrompt = `You are a supply chain optimization expert. Analyze inventory levels and sales patterns${isSuperAdmin ? ' across all accounts' : ''} to provide:
- Specific products that should be reordered now
- Suggested reorder quantities based on sales velocity
- Priority levels for each reorder${isSuperAdmin ? ' organized by account' : ''}
- Estimated costs and timing considerations

Format your response as a prioritized list with specific actionable recommendations.`;
        dataContext = `Inventory${isSuperAdmin ? ' (All Accounts)' : ''}:\n${JSON.stringify(enrichedInventory, null, 2)}\n\nRecent Orders (Last 30 days)${isSuperAdmin ? ' (All Accounts)' : ''}:\n${JSON.stringify(ordersData, null, 2)}`;
        break;

      case 'general-insights':
      default:
        systemPrompt = `You are a business intelligence expert specializing in inventory management. Provide a comprehensive analysis${isSuperAdmin ? ' across all accounts' : ''} covering:
- Overall inventory health${isSuperAdmin ? ' by account' : ''}
- Key metrics and KPIs
- Top opportunities for improvement
- Risk factors or concerns
- Strategic recommendations${isSuperAdmin ? ' for each account' : ''}

Format your response in clear, actionable sections.`;
        dataContext = `Inventory${isSuperAdmin ? ' (All Accounts)' : ''}:\n${JSON.stringify(enrichedInventory, null, 2)}\n\nRecent Orders (Last 30 days)${isSuperAdmin ? ' (All Accounts)' : ''}:\n${JSON.stringify(ordersData, null, 2)}`;
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