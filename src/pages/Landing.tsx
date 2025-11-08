import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Store, 
  Users, 
  Package, 
  BarChart3, 
  Shield, 
  Zap,
  Check,
  TrendingUp,
  FileText,
  Building2
} from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();

  // Fetch pricing tiers from database
  const { data: tiersData } = useQuery({
    queryKey: ['pricing-tiers'],
    queryFn: async () => {
      const { data: tiers, error: tiersError } = await supabase
        .from('pricing_tiers')
        .select('*')
        .order('sort_order');
      
      if (tiersError) throw tiersError;

      const { data: features, error: featuresError } = await supabase
        .from('tier_features')
        .select('*')
        .order('sort_order');
      
      if (featuresError) throw featuresError;

      return tiers.map(tier => ({
        ...tier,
        features: features
          .filter(f => f.tier_id === tier.id)
          .map(f => f.feature_name)
      }));
    }
  });

  const features = [
    {
      icon: Package,
      title: "Inventory Management",
      description: "Track stock levels, manage products, and get low-stock alerts in real-time"
    },
    {
      icon: Store,
      title: "Point of Sale",
      description: "Fast and efficient POS system with cart management and checkout"
    },
    {
      icon: Users,
      title: "Customer Management",
      description: "Maintain customer records and track purchase history"
    },
    {
      icon: BarChart3,
      title: "AI-Powered Insights",
      description: "Get intelligent analytics and recommendations for your business"
    },
    {
      icon: FileText,
      title: "Order History",
      description: "Complete transaction records with detailed reporting"
    },
    {
      icon: Zap,
      title: "Multi-User Support",
      description: "Role-based access for admins, managers, and staff"
    }
  ];

  const defaultTiers = [
    {
      name: "Starter",
      price: "₱999",
      period: "/month",
      description: "Perfect for small businesses getting started",
      features: [
        "Up to 100 products",
        "Basic POS system",
        "Customer management",
        "Order history",
        "Basic reports",
        "Email support"
      ],
      is_popular: false
    },
    {
      name: "Professional",
      price: "₱2,499",
      period: "/month",
      description: "Growing businesses with advanced needs",
      features: [
        "Unlimited products",
        "Advanced POS features",
        "Inventory tracking",
        "Supplier management",
        "Multi-user support",
        "Advanced analytics",
        "Priority support"
      ],
      is_popular: true
    },
    {
      name: "Enterprise",
      price: "₱4,999",
      period: "/month",
      description: "Full-featured for large operations",
      features: [
        "Everything in Professional",
        "AI-powered insights",
        "Custom reports",
        "Expense tracking",
        "Audit logs",
        "API access",
        "Dedicated support"
      ],
      is_popular: false
    }
  ];

  const tiers = tiersData || defaultTiers;

  const benefits = [
    {
      title: "Increase Efficiency",
      description: "Streamline operations and reduce manual work with automated workflows",
      icon: TrendingUp
    },
    {
      title: "Real-Time Updates",
      description: "Stay informed with instant updates on inventory and sales",
      icon: Zap
    },
    {
      title: "Secure & Reliable",
      description: "Enterprise-grade security with role-based access control",
      icon: Shield
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">BusinessHub</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            <a href="#benefits" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Benefits
            </a>
            <Button variant="ghost" onClick={() => navigate("/auth")}>
              Sign In
            </Button>
            <Button variant="hero" onClick={() => navigate("/auth")}>
              Get Started
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-5" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge className="mb-4" variant="secondary">
              Complete Business Management
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-hero bg-clip-text text-transparent">
              Manage Your Business with Confidence
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              A comprehensive platform for inventory, sales, customers, and insights. 
              Everything you need to run your business efficiently, all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="hero" 
                onClick={() => navigate("/auth")}
                className="text-lg"
              >
                <Building2 className="h-5 w-5" />
                Start Free Trial
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="text-lg"
              >
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help you manage every aspect of your business
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="border-border/50 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <feature.icon className="h-10 w-10 text-primary mb-4" />
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Choose the plan that fits your business needs. All plans include core features.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {tiers.map((tier, index) => (
              <Card 
                key={index} 
                className={`relative ${tier.is_popular ? 'border-primary shadow-primary' : ''}`}
              >
                {tier.is_popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature, fIndex) => (
                      <li key={fIndex} className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-success shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full mt-6" 
                    variant={tier.is_popular ? "hero" : "outline"}
                    onClick={() => navigate("/auth")}
                  >
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Choose BusinessHub?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Built for businesses that want to grow and scale efficiently
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <benefit.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features List Section */}
      <section className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-2xl font-bold mb-6">Core Features</h3>
                <ul className="space-y-3">
                  {[
                    "Real-time inventory tracking",
                    "Fast POS checkout",
                    "Customer database",
                    "Sales reporting",
                    "Multi-user accounts",
                    "Expense tracking"
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-success shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-6">Advanced Capabilities</h3>
                <ul className="space-y-3">
                  {[
                    "AI-powered insights",
                    "Category management",
                    "Low-stock alerts",
                    "Supplier management",
                    "Audit logs",
                    "Custom reporting"
                  ].map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-success shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Transform Your Business?
          </h2>
          <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
            Join businesses already using BusinessHub to streamline their operations and boost efficiency
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            onClick={() => navigate("/auth")}
            className="text-lg"
          >
            Start Your Free Trial
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-primary" />
              <span className="font-semibold">BusinessHub</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 BusinessHub. Built for Modern Businesses.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
