import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { Check, Download, PackageOpen } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DownloadInfo {
  downloadUrl: string;
  fileName: string;
  fileSize: string;
  instructions: string;
}

export default function PaymentSuccess() {
  const { user, refetchUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [downloadInfo, setDownloadInfo] = useState<DownloadInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is authenticated and has premium status
  useEffect(() => {
    if (!user) {
      setLocation("/login");
      return;
    }

    const fetchUserData = async () => {
      try {
        await refetchUser();
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
    };

    fetchUserData();
  }, [user, setLocation, refetchUser]);

  // Function to handle Pro Pack download
  const handleDownload = async () => {
    if (user?.subscriptionType !== "premium-lifetime") {
      toast({
        title: "Premium Required",
        description: "Only lifetime premium users can download the Pro Pack",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("GET", "/api/download-pro-pack");
      const data = await response.json();
      setDownloadInfo(data);
      
      // In a real application, this would initiate a download
      // For now, we just show the download info
      toast({
        title: "Download Ready",
        description: "Your Pro Pack is ready to download",
      });
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: "Download Failed",
        description: "There was an error preparing your download",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Special message for lifetime premium users
  if (user?.subscriptionType === "premium-lifetime") {
    return (
      <div className="container max-w-3xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          <div className="text-center mb-8">
            <span className="inline-block p-3 rounded-full bg-[#4CAF50]/10 text-[#4CAF50] mb-4">
              <Check size={30} />
            </span>
            <h1 className="font-[Outfit] text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2">
              Thank You for Your Purchase!
            </h1>
            <p className="text-[#4A4A4A]">
              You now have lifetime access to all premium features of SnapThePlant.
            </p>
          </div>

          <div className="bg-[#F9F9F7] rounded-lg p-6 mb-8">
            <h2 className="font-[Outfit] text-xl font-semibold mb-4 flex items-center">
              <PackageOpen className="mr-2" size={20} />
              SnapThePlant Pro Pack
            </h2>
            
            {downloadInfo ? (
              <div className="space-y-4">
                <p className="text-[#4A4A4A]">{downloadInfo.instructions}</p>
                
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-[#E8E8E2]">
                  <div className="flex items-center">
                    <Download size={18} className="text-[#4CAF50] mr-2" />
                    <div>
                      <p className="font-medium">{downloadInfo.fileName}</p>
                      <p className="text-xs text-[#4A4A4A]">{downloadInfo.fileSize}</p>
                    </div>
                  </div>
                  
                  <a 
                    href={downloadInfo.downloadUrl} 
                    download
                    className="py-1.5 px-4 bg-[#4CAF50] hover:bg-[#3B8C3F] text-white text-sm font-medium rounded transition-colors"
                  >
                    Download
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[#4A4A4A]">
                  Download the offline version of SnapThePlant for access to plant identification features without an internet connection.
                </p>
                
                <button
                  onClick={handleDownload}
                  disabled={isLoading}
                  className="w-full py-2.5 bg-[#4CAF50] hover:bg-[#3B8C3F] text-white font-medium rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Preparing Download...
                    </>
                  ) : (
                    <>
                      <Download size={18} className="mr-2" />
                      Download Pro Pack
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

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
          
          <div className="mt-8 pt-4 border-t border-[#F5F5F0] text-center">
            <button
              onClick={() => setLocation("/dashboard")}
              className="py-2.5 px-6 bg-[#F5F5F0] hover:bg-[#E8E8E2] text-[#1A1A1A] font-medium rounded-lg transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Regular success message for monthly subscribers
  if (user?.subscriptionType === "premium") {
    return (
      <div className="container max-w-3xl mx-auto p-4 md:p-8">
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          <div className="text-center mb-8">
            <span className="inline-block p-3 rounded-full bg-[#4CAF50]/10 text-[#4CAF50] mb-4">
              <Check size={30} />
            </span>
            <h1 className="font-[Outfit] text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-2">
              Subscription Activated!
            </h1>
            <p className="text-[#4A4A4A]">
              Your premium subscription has been successfully activated.
            </p>
          </div>

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
          
          <div className="mt-8 pt-4 border-t border-[#F5F5F0] text-center">
            <button
              onClick={() => setLocation("/dashboard")}
              className="py-2.5 px-6 bg-[#F5F5F0] hover:bg-[#E8E8E2] text-[#1A1A1A] font-medium rounded-lg transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Message for free users who somehow got to this page
  return (
    <div className="container max-w-3xl mx-auto p-4 md:p-8">
      <div className="bg-white rounded-xl shadow-sm p-6 md:p-8 text-center">
        <h1 className="font-[Outfit] text-xl md:text-2xl font-bold text-[#1A1A1A] mb-4">
          Upgrade to Premium
        </h1>
        <p className="mb-6 text-[#4A4A4A]">
          You don't have an active premium subscription yet.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setLocation("/subscribe")}
            className="py-2.5 px-6 bg-[#4CAF50] hover:bg-[#3B8C3F] text-white font-medium rounded-lg transition-colors"
          >
            Subscribe Monthly
          </button>
          <button
            onClick={() => setLocation("/checkout")}
            className="py-2.5 px-6 bg-[#F5F5F0] hover:bg-[#E8E8E2] text-[#1A1A1A] font-medium rounded-lg transition-colors"
          >
            Lifetime Purchase
          </button>
        </div>
      </div>
    </div>
  );
}