import { useEffect, useState } from "react";
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Check } from "lucide-react";

// Make sure to call `loadStripe` outside of a component's render to avoid
// recreating the `Stripe` object on every render.
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin,
        },
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Payment Successful",
          description: "You are subscribed!",
        });
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
        {isProcessing ? "Processing..." : "Subscribe Now"}
      </button>
    </form>
  );
};

export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const { user, refetchUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    const getSubscription = async () => {
      try {
        const response = await apiRequest("POST", "/api/create-subscription");
        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error("Subscription error:", error);
        toast({
          title: "Error",
          description: "Could not initialize subscription. Please try again later.",
          variant: "destructive",
        });
      }
    };

    if (user) {
      getSubscription();
    }
  }, [user, toast]);

  // If the user is already subscribed
  if (user?.subscriptionType === "premium" || user?.subscriptionType === "premium-lifetime") {
    return (
      <div className="container max-w-4xl mx-auto p-4 md:p-8">
        <div className="text-center mb-8">
          <span className="inline-block p-3 rounded-full bg-[#4CAF50]/10 text-[#4CAF50] mb-4">
            <Check size={30} />
          </span>
          <h1 className="font-[Outfit] text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2">
            You're a Premium Member
          </h1>
          <p className="text-[#4A4A4A]">
            {user?.subscriptionType === "premium-lifetime" 
              ? "You have lifetime access to all premium features of SnapThePlant."
              : "You already have access to all premium features of SnapThePlant."}
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          <h2 className="font-[Outfit] text-xl font-semibold mb-4">Your Premium Benefits</h2>
          
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
                <h3 className="font-medium">Disease Diagnosis</h3>
                <p className="text-sm text-[#4A4A4A]">Identify and treat common plant diseases and pest problems</p>
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
        </div>
      </div>
    );
  }

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
          Upgrade to Premium
        </h1>
        <p className="text-[#4A4A4A]">
          Get unlimited plant identifications and advanced care features.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-6">
            <h2 className="font-[Outfit] text-xl font-semibold mb-2">Premium Benefits</h2>
            <p className="text-[#4A4A4A] text-sm">Enjoy these exclusive features with your subscription:</p>
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
                <h3 className="font-medium">Disease Diagnosis</h3>
                <p className="text-sm text-[#4A4A4A]">Identify and treat common plant diseases and pest problems</p>
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
              <span className="font-medium">Monthly subscription</span>
              <span className="font-[Outfit] text-xl font-semibold">$4.99</span>
            </div>
            <p className="text-xs text-[#4A4A4A]">Cancel anytime. No long-term commitment required.</p>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-[Outfit] text-xl font-semibold mb-6">Payment Details</h2>
          
          {/* Make SURE to wrap the form in <Elements> which provides the stripe context. */}
          <Elements stripe={stripePromise} options={{ clientSecret }}>
            <SubscribeForm />
          </Elements>
          
          <div className="mt-6 pt-4 border-t border-[#F5F5F0] text-center text-xs text-[#4A4A4A]">
            <p>Your payment is secured with SSL encryption.</p>
            <p className="mt-1">By subscribing, you agree to our Terms of Service and Privacy Policy.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
