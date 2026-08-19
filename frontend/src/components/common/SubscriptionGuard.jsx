import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { subscriptionService } from '../../services/subscriptionService';
import SubscriptionRequired from './SubscriptionRequired';

export default function SubscriptionGuard({ children, featureName = 'this feature' }) {
  const { data: subRes, isLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: subscriptionService.getMySubscription,
  });

  const hasActiveSub = subRes?.data?.hasActiveSubscription || subRes?.hasActiveSubscription || false;

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold text-slate-600">Verifying Subscription Access...</p>
      </div>
    );
  }

  if (!hasActiveSub) {
    return <SubscriptionRequired featureName={featureName} />;
  }

  return children;
}
