import React from 'react';

interface NotificationProps {
  type?: 'success' | 'error' | 'warning';
  message: string;
  duration?: number;
  onDismiss?: (id: number) => void;
  id?: string | number;
}

declare const Notification: React.FC<NotificationProps>;
export default Notification;
