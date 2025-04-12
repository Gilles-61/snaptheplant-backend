import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  // Check if user is admin (for developer testing tools)
  const isAdmin = user?.username === "admin" || (user?.email && user?.email.includes("admin"));

  const navItems = [
    { path: "/", label: "Dashboard", icon: "dashboard" },
    { path: "/my-plants", label: "My Plants", icon: "yard" },
    { path: "/identify", label: "Identify", icon: "photo_camera" },
    { path: "/care-schedule", label: "Care Schedule", icon: "calendar_today" },
    { path: "/community", label: "Community", icon: "groups" },
  ];
  
  // Admin section for developer testing
  const adminItems = [
    { path: "/admin", label: "Admin Panel", icon: "admin_panel_settings" },
  ];

  return (
    <aside className="hidden md:flex md:flex-col md:w-80 bg-white shadow-md border-r border-[#F5F5F0]">
      {/* Logo Section */}
      <div className="flex items-center p-6">
        <span className="material-icons text-[#4CAF50] mr-2">eco</span>
        <h1 className="font-[Outfit] font-semibold text-xl">SnapThePlant</h1>
      </div>
      
      {/* Main Navigation */}
      <nav className="flex-1 py-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link href={item.path}>
                <div
                  className={`px-6 py-3 flex items-center cursor-pointer ${
                    location === item.path
                      ? "bg-[#4CAF50]/10 border-r-4 border-[#4CAF50] text-[#4CAF50]"
                      : "text-[#4A4A4A] hover:bg-[#FAFAF2] transition-colors"
                  }`}
                >
                  <span className="material-icons text-xl mr-3">{item.icon}</span>
                  <span className="font-medium text-lg">{item.label}</span>
                </div>
              </Link>
            </li>
          ))}
          
          {/* Admin section - only visible to admin users */}
          {isAdmin && (
            <>
              <li className="mt-4 px-6 py-2">
                <div className="text-xs uppercase tracking-wide text-[#4A4A4A]/60 font-semibold">
                  Developer Tools
                </div>
              </li>
              {adminItems.map((item) => (
                <li key={item.path}>
                  <Link href={item.path}>
                    <div
                      className={`px-6 py-3 flex items-center cursor-pointer ${
                        location === item.path
                          ? "bg-[#FF5722]/10 border-r-4 border-[#FF5722] text-[#FF5722]"
                          : "text-[#4A4A4A] hover:bg-[#FAFAF2] transition-colors"
                      }`}
                    >
                      <span className="material-icons text-xl mr-3">{item.icon}</span>
                      <span className="font-medium text-lg">{item.label}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </>
          )}
        </ul>
      </nav>
      
      {/* Subscription Status */}
      <div className="p-4 m-4 bg-[#F5F5F0] rounded-xl">
        <div className="flex items-center mb-2">
          <span className="material-icons text-2xl text-[#FF9800] mr-2">stars</span>
          <h3 className="font-medium text-lg">
            {user?.subscriptionType === "premium" 
              ? "Premium Plan" 
              : user?.subscriptionType === "premium-lifetime" 
                ? "Lifetime Premium" 
                : user?.subscriptionType === "trial" 
                  ? "Free Trial" 
                  : "Free Plan"}
          </h3>
        </div>
        <p className="text-base text-[#4A4A4A] mb-3">
          {user?.subscriptionType === "premium" || user?.subscriptionType === "premium-lifetime"
            ? "Enjoy unlimited plant identification and premium features." 
            : user?.subscriptionType === "trial"
              ? "Try premium features for a limited time."
              : "Upgrade to Premium for unlimited identification and advanced features."}
        </p>
        {(user?.subscriptionType !== "premium" && user?.subscriptionType !== "premium-lifetime") && (
          <div className="space-y-2">
            <Link href="/subscribe">
              <div className="w-full bg-[#FF9800] hover:bg-[#F57C00] text-white py-3 px-4 rounded-lg font-medium text-base transition-colors inline-block text-center cursor-pointer">
                Subscribe Monthly
              </div>
            </Link>
            <Link href="/checkout">
              <div className="w-full bg-white border border-[#FF9800] text-[#FF9800] hover:bg-[#FFF8E1] py-3 px-4 rounded-lg font-medium text-base transition-colors inline-block text-center cursor-pointer">
                Lifetime Purchase
              </div>
            </Link>
          </div>
        )}
      </div>
      
      {/* Support & Help Link */}
      <div className="px-6 py-3 text-center">
        <div className="text-xs text-[#4A4A4A]">
          Need help? <a href="mailto:support@snaptheplant.com" className="text-[#4CAF50] hover:underline">support@snaptheplant.com</a>
        </div>  
      </div>
          
      {/* User Profile */}
      {user && (
        <div className="border-t border-[#F5F5F0] p-4 flex items-center">
          <div className="w-10 h-10 rounded-full bg-[#4CAF50] text-white flex items-center justify-center">
            {user.firstName?.charAt(0) || user.username.charAt(0)}
          </div>
          <div className="ml-3">
            <p className="font-medium">{user.firstName || user.username}</p>
            <p className="text-xs text-[#4A4A4A]">{user.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto text-[#4A4A4A] hover:text-[#1A1A1A]"
            onClick={logout}
          >
            <span className="material-icons">logout</span>
          </Button>
        </div>
      )}
    </aside>
  );
}
