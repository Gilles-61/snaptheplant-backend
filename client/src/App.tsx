import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Identify from "@/pages/identify";
import MyPlants from "@/pages/my-plants";
import CareSchedule from "@/pages/care-schedule";
import Community from "@/pages/community";
import Subscribe from "@/pages/subscribe";
import Checkout from "@/pages/checkout";
import PaymentSuccess from "@/pages/payment-success";
import Admin from "@/pages/admin";
import { AuthProvider } from "@/contexts/auth-context";
import { PlantProvider } from "@/contexts/plant-context";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/identify" component={Identify} />
      <Route path="/my-plants" component={MyPlants} />
      <Route path="/care-schedule" component={CareSchedule} />
      <Route path="/community" component={Community} />
      <Route path="/subscribe" component={Subscribe} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [location] = useLocation();
  
  // These routes will not show the sidebar and mobile navigation
  const isFullscreenRoute = location === "/checkout" || 
                           location === "/payment-success";
                           
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PlantProvider>
          {isFullscreenRoute ? (
            <main className="min-h-screen bg-[#FAFAF2] overflow-auto p-4 max-w-[1600px] mx-auto">
              <Router />
            </main>
          ) : (
            <>
              <div className="flex min-h-screen bg-[#FAFAF2] max-w-[1600px] mx-auto">
                <Sidebar />
                <main className="flex-1 overflow-auto bg-[#FAFAF2] p-4">
                  <Router />
                </main>
              </div>
              <MobileNav />
            </>
          )}
          <Toaster />
        </PlantProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
