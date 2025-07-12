// src/services/push-notifications.ts

const PUBLIC_VAPID_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY || '';

export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) return 'denied';
  return await Notification.requestPermission();
};

export const subscribeUserToPush = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
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
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (subscription) {
    await subscription.unsubscribe();
    return true;
  }
  return false;
};

export const getPushSubscription = async (): Promise<PushSubscription | null> => {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
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