import { FC } from 'react';
declare const Notification: FC<{
  id: number;
  type: string;
  message: string;
  duration: number;
  onDismiss: (id: number) => void;
}>;
export default Notification;
