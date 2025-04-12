import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { usePlant } from "@/contexts/plant-context";
import { CareActionCard } from "@/components/care-action-card";
import { QuickActionCard } from "@/components/quick-action-card";
import { PlantCard } from "@/components/plant-card";
import { AddPlantModal } from "@/components/add-plant-modal";
import { IdentifyModal } from "@/components/identify-modal";
import { format, differenceInDays } from "date-fns";
import { trackEvent, AnalyticsEvent } from "@/lib/analytics";
import { usePremiumFeatures } from "@/hooks/use-premium-features";

export default function Dashboard() {
  const { toast } = useToast();
  const { user, refetchUser } = useAuth();
  const [, navigate] = useLocation();
  const { 
    showAddPlantModal, setShowAddPlantModal,
    showIdentifyModal, setShowIdentifyModal
  } = usePlant();

  // Fetch plants
  const { data: plants, isLoading: plantsLoading } = useQuery({
    queryKey: ['/api/plants'],
    enabled: !!user,
  });

  // Fetch pending care actions
  const { 
    data: careActions, 
    isLoading: actionsLoading,
    refetch: refetchCareActions 
  } = useQuery({
    queryKey: ['/api/care-actions/pending'],
    enabled: !!user,
  });

  // Handle care action completion
  const handleMarkActionDone = async (actionId: number) => {
    try {
      // Track analytics event
      trackEvent(AnalyticsEvent.MARKED_CARE_ACTION_COMPLETE);
      
      await fetch(`/api/care-actions/${actionId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });
      
      // Refetch care actions and plants
      refetchCareActions();
      
      toast({
        title: "Care action completed",
        description: "Your plant care activity has been logged.",
      });
    } catch (error) {
      console.error("Error completing care action:", error);
      toast({
        title: "Error",
        description: "Failed to complete care action. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Display welcome message based on time of day
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="h-full flex flex-col">
      {/* Mobile Top Navigation */}
      <header className="bg-white shadow-sm p-4 md:hidden flex items-center justify-between">
        <div className="flex items-center">
          <span className="material-icons text-[#4CAF50] mr-2">eco</span>
          <h1 className="font-[Outfit] font-bold text-xl">Plantify</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full hover:bg-[#F5F5F0] transition-colors">
            <span className="material-icons">notifications</span>
          </button>
          {user && (
            <div className="w-8 h-8 rounded-full bg-[#4CAF50] text-white flex items-center justify-center">
              {user.firstName?.charAt(0) || user.username.charAt(0)}
            </div>
          )}
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {/* Welcome Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="font-[Outfit] text-2xl md:text-3xl font-bold text-[#1A1A1A]">
              {getTimeBasedGreeting()}, {user?.firstName || user?.username}! 👋
            </h1>
            <p className="text-[#4A4A4A] mt-1">It's time to check on your plants.</p>
          </div>
          <div className="mt-4 md:mt-0">
            <button 
              className="bg-[#4CAF50] hover:bg-[#3B8C3F] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center"
              onClick={() => setShowAddPlantModal(true)}
            >
              <span className="material-icons mr-2">add</span>
              Add New Plant
            </button>
          </div>
        </div>
        
        {/* Free Trial Banner (for free users only) */}
        {user && (user.subscriptionType === "free" || user.subscriptionType === "trial") && (
          <div className="mb-8 bg-[#FFF8E1] border border-[#FFECB3] rounded-xl p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div className="flex items-start md:items-center">
                <span className="material-icons text-[#FF9800] mr-3 text-2xl">stars</span>
                <div>
                  {user?.subscriptionType === "trial" ? (
                    <>
                      <h3 className="font-medium text-lg mb-1">Premium Trial Active!</h3>
                      <p className="text-[#4A4A4A] text-sm md:text-base">
                        You're enjoying premium features until {user.trialEndDate ? new Date(user.trialEndDate).toLocaleDateString() : "trial ends"}.
                      </p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-medium text-lg mb-1">Try Premium for Free!</h3>
                      <p className="text-[#4A4A4A] text-sm md:text-base">Enjoy unlimited plant identification and premium features for 3 days.</p>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-4 md:mt-0 flex space-x-2">
                {user?.subscriptionType === "trial" ? (
                  <>
                    <button 
                      className="bg-[#FF9800] hover:bg-[#F57C00] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center"
                      onClick={() => {
                        trackEvent(AnalyticsEvent.CLICKED_GO_PRO, { option: 'monthly', source: 'trial_banner' });
                        navigate("/subscribe");
                      }}
                    >
                      Upgrade to Premium
                    </button>
                    <button 
                      className="border border-[#FF9800] text-[#FF9800] hover:bg-[#FFF8E1] py-2 px-4 rounded-lg font-medium transition-colors"
                      onClick={() => {
                        trackEvent(AnalyticsEvent.CLICKED_GO_PRO, { option: 'lifetime', source: 'trial_banner' });
                        navigate("/checkout");
                      }}
                    >
                      Get Lifetime Access
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      className="bg-[#FF9800] hover:bg-[#F57C00] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center"
                      onClick={async () => {
                        try {
                          // Track the trial start attempt
                          trackEvent(AnalyticsEvent.STARTED_TRIAL, { source: 'dashboard_banner' });
                          
                          const response = await fetch('/api/start-free-trial', {
                            method: 'POST',
                            credentials: 'include',
                          });
                          
                          if (response.ok) {
                            toast({
                              title: "Free Trial Activated!",
                              description: "Enjoy premium features for the next 3 days.",
                            });
                            // Refresh user data
                            await refetchUser();
                          } else {
                            const data = await response.json();
                            toast({
                              title: "Error",
                              description: data.message || "Could not start free trial.",
                              variant: "destructive",
                            });
                          }
                        } catch (error) {
                          console.error("Trial error:", error);
                          toast({
                            title: "Error",
                            description: "Could not start free trial. Please try again.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Start Free Trial
                    </button>
                    <button 
                      className="border border-[#FF9800] text-[#FF9800] hover:bg-[#FFF8E1] py-2 px-4 rounded-lg font-medium transition-colors"
                      onClick={() => navigate("/subscribe")}
                    >
                      Learn More
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Care Actions Required */}
        <div className="mb-8">
          <h2 className="font-[Outfit] text-xl font-semibold mb-4">Care Actions Required</h2>
          {actionsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-sm h-32 animate-pulse"></div>
              ))}
            </div>
          ) : careActions && careActions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {careActions.map((action) => (
                <CareActionCard 
                  key={action.id} 
                  action={action} 
                  onMarkDone={() => handleMarkActionDone(action.id)} 
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center">
              <span className="material-icons text-[#4CAF50] text-4xl mb-2">check_circle</span>
              <h3 className="font-medium text-lg mb-1">All caught up!</h3>
              <p className="text-[#4A4A4A]">No plant care actions needed right now.</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="font-[Outfit] text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <QuickActionCard 
              icon="photo_camera" 
              label="Identify Plant" 
              color="#4CAF50" 
              onClick={() => setShowIdentifyModal(true)}
            />
            <QuickActionCard 
              icon="water_drop" 
              label="Log Watering" 
              color="#8BC34A" 
            />
            <QuickActionCard 
              icon="calendar_today" 
              label="Care Schedule" 
              color="#FF9800" 
            />
            <QuickActionCard 
              icon="article" 
              label="Care Tips" 
              color="#2196F3" 
            />
          </div>
        </div>

        {/* My Plant Collection */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-[Outfit] text-xl font-semibold">My Plant Collection</h2>
            <a href="/my-plants" className="text-[#4CAF50] hover:text-[#3B8C3F] text-sm font-medium flex items-center">
              View All
              <span className="material-icons text-sm ml-1">chevron_right</span>
            </a>
          </div>
          
          {plantsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16 md:mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-xl shadow-sm h-64 animate-pulse"></div>
              ))}
            </div>
          ) : plants && plants.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16 md:mb-8">
              {plants.slice(0, 3).map((plant) => (
                <PlantCard key={plant.id} plant={plant} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm p-8 text-center mb-16 md:mb-8">
              <span className="material-icons text-[#FF9800] text-4xl mb-3">eco</span>
              <h3 className="font-medium text-xl mb-2">No plants yet</h3>
              <p className="text-[#4A4A4A] mb-4">Start building your plant collection by adding your first plant.</p>
              <button 
                className="bg-[#4CAF50] hover:bg-[#3B8C3F] text-white py-2 px-4 rounded-lg font-medium transition-colors inline-flex items-center"
                onClick={() => setShowAddPlantModal(true)}
              >
                <span className="material-icons mr-2">add</span>
                Add First Plant
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AddPlantModal 
        isOpen={showAddPlantModal} 
        onClose={() => setShowAddPlantModal(false)} 
      />
      
      <IdentifyModal 
        isOpen={showIdentifyModal} 
        onClose={() => setShowIdentifyModal(false)} 
      />
    </div>
  );
}
