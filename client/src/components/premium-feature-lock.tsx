import { useState } from 'react';
import { useLocation } from 'wouter';
import { Lock, Star, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { trackEvent, AnalyticsEvent } from '@/lib/analytics';

interface PremiumFeatureLockProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

export function PremiumFeatureLock({ isOpen, onClose, featureName }: PremiumFeatureLockProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<'subscribe' | 'lifetime' | 'trial'>('subscribe');

  if (!isOpen) return null;

  // Don't show for premium or trial users
  if (user?.subscriptionType === 'premium' || 
      user?.subscriptionType === 'premium-lifetime' ||
      user?.subscriptionType === 'trial') {
    return null;
  }

  const handleStartTrial = async () => {
    try {
      trackEvent(AnalyticsEvent.CLICKED_GO_PRO, { 
        option: 'trial',
        feature: featureName
      });
      
      await fetch('/api/start-free-trial', {
        method: 'POST',
        credentials: 'include',
      });
      
      onClose();
      window.location.reload(); // Refresh to update user status
    } catch (error) {
      console.error('Error starting trial:', error);
    }
  };

  const handleUpgrade = () => {
    trackEvent(AnalyticsEvent.CLICKED_GO_PRO, { 
      option: selectedOption,
      feature: featureName
    });
    
    onClose();
    if (selectedOption === 'subscribe') {
      navigate('/subscribe');
    } else if (selectedOption === 'lifetime') {
      navigate('/checkout');
    } else {
      handleStartTrial();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <div className="bg-[#4CAF50]/10 text-[#4CAF50] p-2 rounded-full">
              <Lock size={24} />
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <span className="material-icons">close</span>
            </button>
          </div>
          
          <h2 className="font-[Outfit] text-xl font-semibold mt-4 mb-2">
            Premium Feature
          </h2>
          
          <p className="text-[#4A4A4A] mb-6">
            The <strong>{featureName}</strong> feature is only available to premium members. Upgrade to access this and all other premium features.
          </p>
          
          <div className="space-y-3 mb-6">
            <label className={`block border rounded-lg p-3 cursor-pointer ${
              selectedOption === 'trial' ? 'border-[#FF9800] bg-[#FFF8E1]' : 'border-gray-200'
            }`}>
              <div className="flex items-start">
                <input
                  type="radio"
                  name="upgrade-option"
                  checked={selectedOption === 'trial'}
                  onChange={() => setSelectedOption('trial')}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium flex items-center">
                    Try Free for 3 Days <Sparkles size={16} className="ml-1 text-[#FF9800]" />
                  </div>
                  <p className="text-sm text-[#4A4A4A]">Experience all premium features without charge</p>
                </div>
              </div>
            </label>
            
            <label className={`block border rounded-lg p-3 cursor-pointer ${
              selectedOption === 'subscribe' ? 'border-[#4CAF50] bg-[#F1F8E9]' : 'border-gray-200'
            }`}>
              <div className="flex items-start">
                <input
                  type="radio"
                  name="upgrade-option"
                  checked={selectedOption === 'subscribe'}
                  onChange={() => setSelectedOption('subscribe')}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium">Monthly Subscription - $4.99/month</div>
                  <p className="text-sm text-[#4A4A4A]">Full access with easy monthly payments</p>
                </div>
              </div>
            </label>
            
            <label className={`block border rounded-lg p-3 cursor-pointer ${
              selectedOption === 'lifetime' ? 'border-[#2196F3] bg-[#E3F2FD]' : 'border-gray-200'
            }`}>
              <div className="flex items-start">
                <input
                  type="radio"
                  name="upgrade-option"
                  checked={selectedOption === 'lifetime'}
                  onChange={() => setSelectedOption('lifetime')}
                  className="mt-1 mr-3"
                />
                <div>
                  <div className="font-medium flex items-center">
                    Lifetime Access - $49.99 <Star size={16} className="ml-1 text-[#FFD700]" />
                  </div>
                  <p className="text-sm text-[#4A4A4A]">One-time payment for permanent access</p>
                </div>
              </div>
            </label>
          </div>
          
          <button 
            onClick={handleUpgrade} 
            className="w-full py-2.5 bg-[#4CAF50] hover:bg-[#3B8C3F] text-white font-medium rounded-lg transition-colors"
          >
            {selectedOption === 'trial' ? 'Start Free Trial' : 'Upgrade Now'}
          </button>
        </div>
      </div>
    </div>
  );
}