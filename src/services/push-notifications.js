"use strict";
// src/services/push-notifications.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendTestNotification = exports.getPushSubscription = exports.unsubscribeUserFromPush = exports.subscribeUserToPush = exports.requestNotificationPermission = exports.isPushSupported = void 0;
const messaging_1 = require("firebase/messaging");
const firebase_1 = require("./firebase");
const messaging = (0, messaging_1.getMessaging)(firebase_1.app);
const VAPID_KEY = process.env.REACT_APP_VAPID_KEY;
const isPushSupported = () => {
    return 'serviceWorker' in navigator && 'PushManager' in window;
};
exports.isPushSupported = isPushSupported;
const requestNotificationPermission = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!('Notification' in window))
        return 'denied';
    return yield Notification.requestPermission();
});
exports.requestNotificationPermission = requestNotificationPermission;
const subscribeUserToPush = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, exports.isPushSupported)())
        return null;
    const registration = yield navigator.serviceWorker.ready;
    try {
        const subscription = yield registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_KEY || '')
        });
        return subscription;
    }
    catch (error) {
        console.error('Push subscription failed:', error);
        return null;
    }
});
exports.subscribeUserToPush = subscribeUserToPush;
const unsubscribeUserFromPush = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, exports.isPushSupported)())
        return false;
    const registration = yield navigator.serviceWorker.ready;
    const subscription = yield registration.pushManager.getSubscription();
    if (subscription) {
        yield subscription.unsubscribe();
        return true;
    }
    return false;
});
exports.unsubscribeUserFromPush = unsubscribeUserFromPush;
const getPushSubscription = () => __awaiter(void 0, void 0, void 0, function* () {
    if (!(0, exports.isPushSupported)())
        return null;
    const registration = yield navigator.serviceWorker.ready;
    return yield registration.pushManager.getSubscription();
});
exports.getPushSubscription = getPushSubscription;
const sendTestNotification = (subscription) => __awaiter(void 0, void 0, void 0, function* () {
    // This should call your backend to send a push notification
    try {
        yield fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription })
        });
    }
    catch (error) {
        console.error('Failed to send test notification:', error);
    }
});
exports.sendTestNotification = sendTestNotification;
function urlBase64ToUint8Array(base64String) {
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
