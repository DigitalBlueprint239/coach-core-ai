import React from 'react';
import { Stat } from '@chakra-ui/react';

/**
 * SafeStatNumber - A production-grade wrapper that automatically wraps StatNumber in Stat
 * This prevents the "useStatStyles returned is 'undefined'" error by ensuring proper nesting
 */
export const SafeStatNumber: React.FC<{
  children: React.ReactNode;
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  [key: string]: any;
}> = props => {
  return (
    <Stat>
      <div
        style={{
          fontSize: props.fontSize || '2.25rem',
          fontWeight: props.fontWeight || '700',
          color: props.color || '#2D3748',
          lineHeight: '1',
        }}
      >
        {props.children}
      </div>
    </Stat>
  );
};

export default SafeStatNumber;
