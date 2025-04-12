import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PremiumFeatureLock } from '@/components/premium-feature-lock';
import { trackEvent, AnalyticsEvent } from '@/lib/analytics';

/**
 * Hook to handle premium feature access control
 * 
 * This hook provides utilities to check if a user can access premium features
 * and show a premium feature lockout UI if they can't
 */
export function usePremiumFeatures() {
  const { user } = useAuth();
  const [showPremiumLock, setShowPremiumLock] = useState(false);
  const [currentFeature, setCurrentFeature] = useState('');

  // Check if the user has premium access (premium, lifetime, or trial subscription)
  const hasPremiumAccess = useCallback(() => {
    if (!user) return false;
    
    return (
      user.subscriptionType === 'premium' || 
      user.subscriptionType === 'premium-lifetime' || 
      user.subscriptionType === 'trial'
    );
  }, [user]);

  // Check if the user's subscription has specific features
  const hasFeature = useCallback((featureName: string) => {
    if (!user) return false;
    
    // Define feature access by subscription type
    const features: Record<string, string[]> = {
      'free': ['basic_identification', 'limited_plants'],
      'trial': ['unlimited_identification', 'disease_diagnosis', 'advanced_care', 'unlimited_plants'],
      'premium': ['unlimited_identification', 'disease_diagnosis', 'advanced_care', 'unlimited_plants'],
      'premium-lifetime': ['unlimited_identification', 'disease_diagnosis', 'advanced_care', 'unlimited_plants', 'offline_mode', 'pro_pack_download']
    };
    
    const userSubscription = user.subscriptionType || 'free';
    return features[userSubscription]?.includes(featureName) || false;
  }, [user]);

  // Attempt to access a premium feature
  const tryPremiumFeature = useCallback((featureName: string) => {
    if (hasPremiumAccess()) {
      return true;
    }
    
    // Track the view of an upgrade prompt
    trackEvent(AnalyticsEvent.VIEWED_UPGRADE_PROMPT, { feature: featureName });
    
    setCurrentFeature(featureName);
    setShowPremiumLock(true);
    return false;
  }, [hasPremiumAccess]);

  // For limited numerical features (like identifications)
  const hasRemainingUsage = useCallback((featureType: 'identifications') => {
    if (!user) return false;
    
    // If user has premium access, they have unlimited usage
    if (hasPremiumAccess()) return true;
    
    // Check specific limits
    switch (featureType) {
      case 'identifications':
        return (user.identificationsRemaining ?? 0) > 0;
      default:
        return false;
    }
  }, [user, hasPremiumAccess]);

  // Try to use a limited feature
  const tryLimitedFeature = useCallback((featureType: 'identifications') => {
    if (hasPremiumAccess()) {
      return true;
    }
    
    if (hasRemainingUsage(featureType)) {
      return true;
    }
    
    // Show premium lock for the specific feature
    const featureNames = {
      'identifications': 'Plant Identification'
    };
    
    setCurrentFeature(featureNames[featureType]);
    setShowPremiumLock(true);
    
    // Track the view of an upgrade prompt
    trackEvent(AnalyticsEvent.VIEWED_UPGRADE_PROMPT, { feature: featureNames[featureType] });
    
    return false;
  }, [hasPremiumAccess, hasRemainingUsage]);

  // Component to render the premium lock UI
  const PremiumFeatureLockUI = useCallback(() => {
    return (
      <PremiumFeatureLock
        isOpen={showPremiumLock}
        onClose={() => setShowPremiumLock(false)}
        featureName={currentFeature}
      />
    );
  }, [showPremiumLock, currentFeature]);

  return {
    hasPremiumAccess,
    hasFeature,
    tryPremiumFeature,
    hasRemainingUsage,
    tryLimitedFeature,
    PremiumFeatureLockUI
  };
}