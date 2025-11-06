import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { z } from "zod";

const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  useEffect(() => {
    // Check for existing session first
    supabase.auth.getSession().then(({ data: { session } }) => {
      // Check if this is a recovery session
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      if (session && type === 'recovery') {
        console.log('Existing recovery session detected');
        setIsResettingPassword(true);
      }
    });

    // Check if user is coming from password reset email
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    
    console.log('Auth page loaded, checking recovery:', { type, hasToken: !!accessToken });
    
    if (type === 'recovery' && accessToken) {
      console.log('Recovery detected, setting reset mode');
      setIsResettingPassword(true);
      // Don't clear the hash yet - keep it until the form is shown
      setTimeout(() => {
        window.history.replaceState(null, '', window.location.pathname);
      }, 1000);
    }

    // Listen for auth state changes to handle recovery flow
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, 'Has session:', !!session);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log('PASSWORD_RECOVERY event detected');
        setIsResettingPassword(true);
      }
      
      // If user has a session but we're in recovery mode, keep them on this page
      if (session && type === 'recovery') {
        console.log('User authenticated via recovery link, staying on reset page');
        setIsResettingPassword(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Logged in successfully!");
        navigate("/");
      }
    } catch (error) {
      toast.error("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate first name and last name
      if (!firstName.trim()) {
        toast.error("First name is required");
        setLoading(false);
        return;
      }

      if (!lastName.trim()) {
        toast.error("Last name is required");
        setLoading(false);
        return;
      }

      // Validate password strength
      const passwordValidation = passwordSchema.safeParse(password);
      if (!passwordValidation.success) {
        toast.error(passwordValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const redirectUrl = `${window.location.origin}/`;
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            full_name: `${firstName.trim()} ${lastName.trim()}`.trim()
          }
        }
      });

      if (error) {
        toast.error(error.message);
      } else {
        // Get user's IP address
        let ipAddress = '';
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipResponse.json();
          ipAddress = ipData.ip;
        } catch (ipError) {
          console.log('Could not fetch IP address');
        }

        // Notify admins about new signup
        if (data.user) {
          try {
            await supabase.functions.invoke('notify-admin-signup', {
              body: {
                userId: data.user.id,
                email: email,
                fullName: `${firstName.trim()} ${lastName.trim()}`.trim(),
                ipAddress: ipAddress
              }
            });
          } catch (notifyError) {
            console.error('Error notifying admins:', notifyError);
            // Don't block signup if notification fails
          }
        }

        toast.success("Account created successfully! Please wait for admin approval to access the system.");
        setIsSignUp(false);
      }
    } catch (error) {
      toast.error("An error occurred during sign up");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset email sent! Please check your inbox.");
        setIsForgotPassword(false);
      }
    } catch (error) {
      toast.error("An error occurred while sending reset email");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate password strength
      const passwordValidation = passwordSchema.safeParse(newPassword);
      if (!passwordValidation.success) {
        toast.error(passwordValidation.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error(error.message);
      } else {
        // Sign out the user after password reset
        await supabase.auth.signOut();
        
        toast.success("Password updated successfully! Please log in with your new password.");
        setIsResettingPassword(false);
        setNewPassword("");
        setEmail("");
        setPassword("");
      }
    } catch (error) {
      toast.error("An error occurred while resetting password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Business Management System</CardTitle>
          <CardDescription className="text-center">
            {isResettingPassword ? "Set your new password" : isForgotPassword ? "Reset your password" : isSignUp ? "Create a new account" : "Sign in to access your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isResettingPassword ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={12}
                  placeholder="Min 12 chars with uppercase, lowercase, number, and symbol"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating password..." : "Update Password"}
              </Button>
            </form>
          ) : (
            <>
              <form onSubmit={isForgotPassword ? handleForgotPassword : isSignUp ? handleSignUp : handleLogin} className="space-y-4">
            {isSignUp && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={12}
                  placeholder={isSignUp ? "Min 12 chars with uppercase, lowercase, number, and symbol" : ""}
                />
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (isForgotPassword ? "Sending reset email..." : isSignUp ? "Creating account..." : "Logging in...") : (isForgotPassword ? "Send Reset Email" : isSignUp ? "Sign Up" : "Login")}
            </Button>
          </form>
          
          {!isForgotPassword && !isSignUp && (
            <div className="mt-3 text-center text-sm">
              <button
                type="button"
                onClick={() => setIsForgotPassword(true)}
                className="text-primary hover:underline font-medium"
              >
                Forgot password?
              </button>
            </div>
          )}
          
          <div className="mt-4 text-center text-sm">
            {isForgotPassword ? (
              <>
                <span className="text-muted-foreground">Remember your password?</span>
                {" "}
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-primary hover:underline font-medium"
                >
                  Back to Login
                </button>
              </>
            ) : (
              <>
                <span className="text-muted-foreground">
                  {isSignUp ? "Already have an account?" : "Don't have an account?"}
                </span>
                {" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary hover:underline font-medium"
                >
                  {isSignUp ? "Login" : "Sign Up"}
                </button>
              </>
            )}
          </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
