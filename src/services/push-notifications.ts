// src/services/push-notifications.ts

const PUBLIC_VAPID_KEY = import.meta.env.REACT_APP_VAPID_PUBLIC_KEY || '';

export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) return 'denied';
  return await Notification.requestPermission();
};

// The app currently registers no service worker (the old offline worker was retired), so look the
// registration up instead of awaiting the worker's `ready` promise, which would never resolve.
const currentRegistration = async (): Promise<ServiceWorkerRegistration | undefined> => {
  if (!isPushSupported()) return undefined;
  try {
    return await navigator.serviceWorker.getRegistration();
  } catch {
    return undefined;
  }
};

/** Push needs a VAPID key and a registered service worker; neither exists today. */
export const isPushAvailable = async (): Promise<boolean> =>
  PUBLIC_VAPID_KEY !== '' && (await currentRegistration()) !== undefined;

/** Asks for notification permission and subscribes, but only when push can actually work. */
export const setUpPushAfterOnboarding = async (): Promise<void> => {
  if (!(await isPushAvailable())) return;
  const permission = await requestNotificationPermission();
  if (permission === 'granted') await subscribeUserToPush();
};

export const subscribeUserToPush = async (): Promise<PushSubscription | null> => {
  const registration = await currentRegistration();
  if (!registration) return null;
  try {
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
    });
    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
};

export const unsubscribeUserFromPush = async (): Promise<boolean> => {
  const registration = await currentRegistration();
  if (!registration) return false;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    return true;
  }
  return false;
};

export const getPushSubscription = async (): Promise<PushSubscription | null> => {
  const registration = await currentRegistration();
  if (!registration) return null;
  return await registration.pushManager.getSubscription();
};

export const sendTestNotification = async (subscription: PushSubscription) => {
  // This should call your backend to send a push notification
  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription })
    });
  } catch (error) {
    console.error('Failed to send test notification:', error);
  }
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
} 