import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface SubscriptionStatusResponse {
  tier: 'free' | 'pro';
  source: 'admin' | 'stripe' | 'no_subscription' | 'stripe_missing';
  details: {
    tier: 'free' | 'pro';
    source: string;
    adminGrantedBy?: string;
    adminGrantedDate?: string;
    stripeStatus?: string;
    accessReason?: string;
    periodEnd?: Date | null;
    cancelAtPeriodEnd?: boolean;
    error?: string;
  };
}

export function useSubscriptionStatus() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/subscription/status-realtime'],
    queryFn: async (): Promise<SubscriptionStatusResponse> => {
      const response = await apiRequest('GET', '/api/subscription/status-realtime');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    retry: 1,
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchOnWindowFocus: true // Refetch when user returns to tab
  });

  const isProUser = data?.tier === 'pro';
  const isAdminGranted = data?.source === 'admin';
  const isStripeActive = data?.source === 'stripe' && data?.details?.stripeStatus === 'active';
  const isInGracePeriod = data?.source === 'stripe' && data?.details?.accessReason === 'grace_period';
  const hasActiveSubscription = isStripeActive || isInGracePeriod;

  return {
    // Basic subscription info
    tier: data?.tier || 'free',
    isProUser,
    isLoading,
    error,
    refetch,
    
    // Source information
    source: data?.source,
    isAdminGranted,
    hasActiveSubscription,
    
    // Stripe-specific details
    stripeStatus: data?.details?.stripeStatus,
    accessReason: data?.details?.accessReason,
    periodEnd: data?.details?.periodEnd,
    cancelAtPeriodEnd: data?.details?.cancelAtPeriodEnd,
    
    // Admin grant details
    adminGrantedBy: data?.details?.adminGrantedBy,
    adminGrantedDate: data?.details?.adminGrantedDate,
    
    // Raw data for debugging
    rawData: data
  };
}