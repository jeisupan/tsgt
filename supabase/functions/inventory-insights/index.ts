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
    const { reportType, accountId } = await req.json();
    
    console.log('Generating inventory insights:', { reportType, accountId });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch inventory data
    const { data: inventoryData, error: inventoryError } = await supabase
      .from('inventory')
      .select(`
        *,
        products (
          name,
          price,
          category
        )
      `)
      .eq('account_id', accountId);

    if (inventoryError) {
      console.error('Error fetching inventory:', inventoryError);
      throw inventoryError;
    }

    // Fetch recent orders for sales insights
    const { data: ordersData, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          quantity,
          price,
          product_id
        )
      `)
      .eq('account_id', accountId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
    }

    // Prepare system prompt based on report type
    let systemPrompt = '';
    let dataContext = '';

    switch (reportType) {
      case 'stock-levels':
        systemPrompt = `You are an inventory management expert. Analyze the current stock levels and provide insights on:
- Items running low on stock that need reordering
- Overstocked items
- Stock distribution across categories
- Recommendations for optimal stock levels

Format your response in clear sections with bullet points and actionable recommendations.`;
        dataContext = `Current Inventory:\n${JSON.stringify(inventoryData, null, 2)}`;
        break;

      case 'sales-trends':
        systemPrompt = `You are a sales analytics expert. Analyze the sales data and provide insights on:
- Best-selling products
- Sales trends over the past 30 days
- Revenue patterns
- Product performance by category
- Recommendations for inventory adjustments based on sales

Format your response in clear sections with bullet points and actionable insights.`;
        dataContext = `Inventory:\n${JSON.stringify(inventoryData, null, 2)}\n\nRecent Orders (Last 30 days):\n${JSON.stringify(ordersData, null, 2)}`;
        break;

      case 'reorder-suggestions':
        systemPrompt = `You are a supply chain optimization expert. Analyze inventory levels and sales patterns to provide:
- Specific products that should be reordered now
- Suggested reorder quantities based on sales velocity
- Priority levels for each reorder
- Estimated costs and timing considerations

Format your response as a prioritized list with specific actionable recommendations.`;
        dataContext = `Inventory:\n${JSON.stringify(inventoryData, null, 2)}\n\nRecent Orders (Last 30 days):\n${JSON.stringify(ordersData, null, 2)}`;
        break;

      case 'general-insights':
      default:
        systemPrompt = `You are a business intelligence expert specializing in inventory management. Provide a comprehensive analysis covering:
- Overall inventory health
- Key metrics and KPIs
- Top opportunities for improvement
- Risk factors or concerns
- Strategic recommendations

Format your response in clear, actionable sections.`;
        dataContext = `Inventory:\n${JSON.stringify(inventoryData, null, 2)}\n\nRecent Orders (Last 30 days):\n${JSON.stringify(ordersData, null, 2)}`;
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