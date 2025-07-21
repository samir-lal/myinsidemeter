import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Zap, Star, Crown, CreditCard, Calendar } from "lucide-react";

export default function SubscriptionCheckout() {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<{ tier: string; billing: string } | null>(null);

  // Mutation to create Stripe checkout session
  const createCheckoutSession = useMutation({
    mutationFn: async ({ tier, billing }: { tier: string; billing: string }) => {
      const response = await apiRequest("POST", "/api/subscription/create-checkout-session", {
        tier,
        billing
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: "Failed to create checkout session",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Checkout error:", error);
      toast({
        title: "Checkout Error",
        description: error.message || "Failed to start checkout process",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (tier: string, billing: string) => {
    setSelectedPlan({ tier, billing });
    createCheckoutSession.mutate({ tier, billing });
  };

  const plans = [
    {
      name: "Free",
      price: { monthly: 0, annual: 0 },
      description: "Basic mood tracking",
      features: [
        "Daily mood logging",
        "Basic moon phase correlation",
        "Simple charts and trends",
        "7-day mood history",
        "Basic community access"
      ],
      tier: "free",
      popular: false,
      buttonText: "Current Plan",
      disabled: true
    },
    {
      name: "Pro",
      price: { monthly: 1.99, annual: 19.99 },
      description: "Advanced analytics and AI insights",
      features: [
        "Everything in Free",
        "Unlimited mood history",
        "AI-powered insights and analysis",
        "Advanced mood analytics dashboard",
        "Predictive mood trends",
        "NLP-driven journal analysis",
        "Historical reports and patterns",
        "Data export capabilities",
        "Priority email support"
      ],
      tier: "pro",
      popular: true,
      buttonText: "Upgrade to Pro",
      disabled: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Transform your emotional wellness journey with AI-powered insights and advanced analytics
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {plans.map((plan) => (
            <Card 
              key={plan.tier} 
              className={`relative overflow-hidden transition-all duration-300 ${
                plan.popular 
                  ? 'ring-2 ring-purple-500 shadow-2xl scale-105' 
                  : 'hover:shadow-xl'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 text-sm font-semibold">
                  <Star className="w-4 h-4 inline mr-1" />
                  Most Popular
                </div>
              )}

              <CardHeader className="text-center pb-2">
                <div className="flex justify-center mb-2">
                  {plan.tier === 'free' ? (
                    <Zap className="w-8 h-8 text-blue-500" />
                  ) : (
                    <Crown className="w-8 h-8 text-purple-500" />
                  )}
                </div>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Pricing */}
                {plan.tier !== 'free' && (
                  <div className="space-y-4">
                    {/* Monthly Option */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="w-4 h-4 text-purple-500" />
                          <span className="font-semibold">Monthly</span>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold">${plan.price.monthly}</span>
                          <span className="text-gray-500">/month</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleSubscribe(plan.tier, 'monthly')}
                        disabled={createCheckoutSession.isPending || (selectedPlan?.tier === plan.tier && selectedPlan?.billing === 'monthly')}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        {createCheckoutSession.isPending && selectedPlan?.tier === plan.tier && selectedPlan?.billing === 'monthly' 
                          ? "Processing..." 
                          : "Subscribe Monthly"
                        }
                      </Button>
                    </div>

                    {/* Annual Option */}
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-purple-500" />
                          <span className="font-semibold">Annual</span>
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Save ${((plan.price.monthly * 12) - plan.price.annual).toFixed(2)}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold">${plan.price.annual}</span>
                          <span className="text-gray-500">/year</span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        ${(plan.price.annual / 12).toFixed(2)}/month billed annually
                      </div>
                      <Button
                        onClick={() => handleSubscribe(plan.tier, 'annual')}
                        disabled={createCheckoutSession.isPending || (selectedPlan?.tier === plan.tier && selectedPlan?.billing === 'annual')}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                      >
                        {createCheckoutSession.isPending && selectedPlan?.tier === plan.tier && selectedPlan?.billing === 'annual' 
                          ? "Processing..." 
                          : "Subscribe Annually"
                        }
                      </Button>
                    </div>
                  </div>
                )}

                {plan.tier === 'free' && (
                  <div className="text-center py-8">
                    <div className="text-3xl font-bold text-gray-400 mb-2">Free</div>
                    <Button disabled className="w-full" variant="outline">
                      Current Plan
                    </Button>
                  </div>
                )}

                {/* Features List */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Features included:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Security Notice */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          <p className="mb-2">🔒 Secure payment processing powered by Stripe</p>
          <p>Your payment information is encrypted and secure. Cancel anytime from your profile settings.</p>
        </div>
      </div>
    </div>
  );
}