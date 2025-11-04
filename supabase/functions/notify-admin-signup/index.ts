import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignupNotification {
  userId: string;
  email: string;
  fullName: string;
  ipAddress?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, fullName, ipAddress }: SignupNotification = await req.json();
    
    console.log("Processing signup notification for user:", email);

    // Create Supabase client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all super admin emails
    const { data: superAdmins, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "super_admin");

    if (adminError) {
      console.error("Error fetching super admins:", adminError);
      throw new Error("Failed to fetch super admins");
    }

    if (!superAdmins || superAdmins.length === 0) {
      console.log("No super admins found in the system");
      return new Response(
        JSON.stringify({ message: "No super admins to notify" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get super admin emails from profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .in("id", superAdmins.map(admin => admin.user_id));

    if (profileError) {
      console.error("Error fetching super admin profiles:", profileError);
      throw new Error("Failed to fetch super admin profiles");
    }

    const adminEmails = profiles.map(profile => profile.email);
    
    if (adminEmails.length === 0) {
      console.log("No super admin emails found");
      return new Response(
        JSON.stringify({ message: "No super admin emails to notify" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Sending notification to ${adminEmails.length} super admin(s)`);

    // Send email to all super admins using Resend API directly
    const emailPromises = adminEmails.map(async (adminEmail) => {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: "Twinstar Gas Trading <onboarding@resend.dev>",
          to: [adminEmail],
          subject: "New User Signup - Action Required",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">New User Registration</h2>
              <p>A new user has signed up and is waiting for role assignment.</p>
              
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #555;">User Details:</h3>
                <p><strong>Full Name:</strong> ${fullName}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>User ID:</strong> ${userId}</p>
                ${ipAddress ? `<p><strong>IP Address:</strong> ${ipAddress}</p>` : ''}
                <p><strong>Registration Date:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <p style="color: #666;">
                Please log in to the admin panel to assign a role to this user. 
                They will not be able to access the system until a role is assigned.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                <p style="color: #999; font-size: 12px;">
                  This is an automated notification from Twinstar Gas Trading system.
                </p>
              </div>
            </div>
          `,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send email: ${errorText}`);
      }

      return await response.json();
    });

    const results = await Promise.allSettled(emailPromises);
    
    const successCount = results.filter(r => r.status === "fulfilled").length;
    const failureCount = results.filter(r => r.status === "rejected").length;

    console.log(`Email notification results: ${successCount} sent, ${failureCount} failed`);

    return new Response(
      JSON.stringify({ 
        message: "Notification processed",
        sent: successCount,
        failed: failureCount
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-admin-signup function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
