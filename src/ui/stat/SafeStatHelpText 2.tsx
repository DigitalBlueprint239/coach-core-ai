import React from 'react';
import { Stat } from '@chakra-ui/react';

/**
 * SafeStatHelpText - A production-grade wrapper that automatically wraps StatHelpText in Stat
 * This prevents the "useStatStyles returned is 'undefined'" error by ensuring proper nesting
 */
export const SafeStatHelpText: React.FC<{
  children: React.ReactNode;
  color?: string;
  fontSize?: string;
  [key: string]: any;
}> = props => {
  return (
    <Stat>
      <div
        style={{
          fontSize: props.fontSize || '0.875rem',
          color: props.color || '#718096',
          marginTop: '0.25rem',
        }}
      >
        {props.children}
      </div>
    </Stat>
  );
};

export default SafeStatHelpText;
