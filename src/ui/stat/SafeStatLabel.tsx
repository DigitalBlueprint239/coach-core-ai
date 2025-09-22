import React from 'react';
import { Stat } from '@chakra-ui/react';

/**
 * SafeStatLabel - A production-grade wrapper that automatically wraps StatLabel in Stat
 * This prevents the "useStatStyles returned is 'undefined'" error by ensuring proper nesting
 */
export const SafeStatLabel: React.FC<{
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
          fontSize: props.fontSize || '0.875rem',
          fontWeight: props.fontWeight || '500',
          color: props.color || '#718096',
          marginBottom: '0.25rem',
        }}
      >
        {props.children}
      </div>
    </Stat>
  );
};

export default SafeStatLabel;
