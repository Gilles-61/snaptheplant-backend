import { Link, useLocation } from "wouter";
import { usePlant } from "@/contexts/plant-context";
import { useAuth } from "@/contexts/auth-context";

export function MobileNav() {
  const [location] = useLocation();
  const { setShowIdentifyModal } = usePlant();
  const { user } = useAuth();
  
  // Show subscription link only for non-premium users
  const isPremium = user?.subscriptionType === "premium" || user?.subscriptionType === "premium-lifetime";

  const navItems = [
    { path: "/", label: "Dashboard", icon: "dashboard" },
    { path: "/my-plants", label: "My Plants", icon: "yard" },
    { path: "/care-schedule", label: "Schedule", icon: "calendar_today" },
    { path: isPremium ? "/community" : "/subscribe", label: isPremium ? "Community" : "Go Pro", icon: isPremium ? "groups" : "stars" },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#F5F5F0] flex justify-around p-1 z-10">
      {navItems.map((item, index) => (
        <Link key={index} href={item.path}>
          <div className={`p-2 flex flex-col items-center ${location === item.path ? "text-[#4CAF50]" : "text-[#4A4A4A]"}`}>
            <span className="material-icons">{item.icon}</span>
            <span className="text-xs mt-1">{item.label}</span>
          </div>
        </Link>
      ))}
      
      {/* Center special button for identify */}
      <button 
        className="p-2 flex flex-col items-center"
        onClick={() => setShowIdentifyModal(true)}
      >
        <div className="rounded-full bg-[#4CAF50] p-2 -mt-5 shadow-lg">
          <span className="material-icons text-white">photo_camera</span>
        </div>
        <span className="text-xs mt-1">Identify</span>
      </button>
    </nav>
  );
}
