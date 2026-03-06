import React from 'react';

export interface NotificationProps {
  id: number;
  type: string;
  message: string;
  duration?: number;
  onDismiss: (id: number) => void;
}

declare const Notification: React.MemoExoticComponent<(props: NotificationProps) => React.ReactElement>;
export default Notification;
