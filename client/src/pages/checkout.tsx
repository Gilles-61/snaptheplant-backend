import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Check, Download, PackageOpen } from "lucide-react";
import { useLocation } from "wouter";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setLocation] = useLocation();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + "/payment-success",
        },
        redirect: "if_required",
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        // Payment successful and not automatically redirected
        try {
          await apiRequest("POST", "/api/payment-success", { 
            paymentIntentId: paymentIntent.id 
          });
          
          toast({
            title: "Payment Successful",
            description: "Thank you for your purchase!",
          });
          
          setLocation("/payment-success");
        } catch (err) {
          console.error("Error updating user after payment:", err);
          toast({
            title: "Error",
            description: "Payment successful but there was an error updating your account. Please contact support.",
            variant: "destructive",
          });
        }
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast({
        title: "Payment Failed",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full py-3 bg-[#4CAF50] hover:bg-[#3B8C3F] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? "Processing..." : "Purchase Now"}
      </button>
    </form>
  );
};

export default function Checkout() {
  const [clientSecret, setClientSecret] = useState("");
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    const getPaymentIntent = async () => {
      try {
        const response = await apiRequest("POST", "/api/create-payment-intent");
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error("Payment intent error:", error);
        toast({
          title: "Error",
          description: "Could not initialize payment. Please try again later.",
          variant: "destructive",
        });
      }
    };

    if (!user) {
      setLocation("/login");
      toast({
        title: "Login Required",
        description: "Please log in to make a purchase",
      });
      return;
    }

    // If the user already has premium access
    if (user.subscriptionType === "premium" || user.subscriptionType === "premium-lifetime") {
      setLocation("/payment-success");
      return;
    }

    getPaymentIntent();
  }, [user, toast, setLocation]);

  if (!clientSecret) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#4CAF50] border-t-transparent rounded-full" aria-label="Loading"/>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-8">
      <div className="text-center mb-8">
        <h1 className="font-[Outfit] text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2">
          One-Time Purchase
        </h1>
        <p className="text-[#4A4A4A]">
          Get lifetime access to premium features with a single payment.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-6">
            <h2 className="font-[Outfit] text-xl font-semibold mb-2">Lifetime Premium Benefits</h2>
            <p className="text-[#4A4A4A] text-sm">One payment, lifetime access to all these features:</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#4CAF50]/10 flex items-center justify-center mt-0.5">
                <Check size={14} className="text-[#4CAF50]" />
              </div>
              <div className="ml-3">
                <h3 className="font-medium">Unlimited Plant Identification</h3>
                <p className="text-sm text-[#4A4A4A]">Identify any number of plants without restrictions</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#4CAF50]/10 flex items-center justify-center mt-0.5">
                <Check size={14} className="text-[#4CAF50]" />
              </div>
              <div className="ml-3">
                <h3 className="font-medium">Advanced Care Recommendations</h3>
                <p className="text-sm text-[#4A4A4A]">Get detailed, customized care tips for your specific plants</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#4CAF50]/10 flex items-center justify-center mt-0.5">
                <Check size={14} className="text-[#4CAF50]" />
              </div>
              <div className="ml-3">
                <h3 className="font-medium">Downloadable Pro Pack</h3>
                <p className="text-sm text-[#4A4A4A]">Get access to the Pro Pack with offline capability</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 h-6 w-6 rounded-full bg-[#4CAF50]/10 flex items-center justify-center mt-0.5">
                <Check size={14} className="text-[#4CAF50]" />
              </div>
              <div className="ml-3">
                <h3 className="font-medium">Priority Customer Support</h3>
                <p className="text-sm text-[#4A4A4A]">Get help quickly whenever you need assistance</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-[#F5F5F0]">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Lifetime purchase</span>
              <span className="font-[Outfit] text-xl font-semibold">$49.99</span>
            </div>
            <p className="text-xs text-[#4A4A4A]">Pay once, own forever. No subscription needed.</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-[Outfit] text-xl font-semibold mb-6">Payment Details</h2>
          
          {/* Make SURE to wrap the form in <Elements> which provides the stripe context. */}
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <CheckoutForm />
          </Elements>
          
          <div className="mt-6 pt-4 border-t border-[#F5F5F0] text-center text-xs text-[#4A4A4A]">
            <p>Your payment is secured with SSL encryption.</p>
            <p className="mt-1">By purchasing, you agree to our Terms of Service and Privacy Policy.</p>
          </div>
        </div>
      </div>
    </div>
  );
};