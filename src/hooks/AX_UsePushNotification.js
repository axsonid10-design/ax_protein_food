import { useEffect, useState, useCallback } from 'react';
import { AX_PushNotificationService } from '../services/AX_PushNotificationService';

export const AX_UsePushNotification = (userId) => {
  const [permission, setPermission] = useState(() => AX_PushNotificationService.getPermissionState());
  const [isSubscribed, setIsSubscribed] = useState(false);
  const isSupported = AX_PushNotificationService.isSupported();

  const syncSubscription = useCallback(async () => {
    if (!isSupported || !userId) return;
    const currentPerm = AX_PushNotificationService.getPermissionState();
    setPermission(currentPerm);

    if (currentPerm === 'granted') {
      try {
        const sub = await AX_PushNotificationService.getActiveSubscription();
        if (sub) {
          setIsSubscribed(true);
        } else {
          const res = await AX_PushNotificationService.subscribeUser(userId);
          setIsSubscribed(Boolean(res.success));
        }
      } catch (e) {
      }
    } else {
      setIsSubscribed(false);
    }
  }, [isSupported, userId]);

  useEffect(() => {
    syncSubscription();
  }, [syncSubscription]);

  const requestAndSubscribe = useCallback(async () => {
    if (!userId) return { success: false, reason: 'missing_user_id' };
    const res = await AX_PushNotificationService.subscribeUser(userId);
    setPermission(AX_PushNotificationService.getPermissionState());
    setIsSubscribed(Boolean(res.success));
    return res;
  }, [userId]);

  return {
    isSupported,
    permission,
    isSubscribed,
    requestAndSubscribe,
    syncSubscription
  };
};
