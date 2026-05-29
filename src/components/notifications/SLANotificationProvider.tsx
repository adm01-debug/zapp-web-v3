import { forwardRef } from 'react';
import { useSLANotifications } from '@/features/sla';

export const SLANotificationProvider = forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  function SLANotificationProvider({ children }, _ref) {
    useSLANotifications();
    return <>{children}</>;
  }
);
